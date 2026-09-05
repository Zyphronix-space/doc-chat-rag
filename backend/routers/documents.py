import os

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

import config
import rag
from db import get_db
from deps import get_current_user, not_found
from ingestion import (
    ExtractionError,
    FileTooLargeError,
    UnsupportedFileError,
    content_hash,
    extract_pages,
    safe_filename,
    validate_upload,
)
from models import Document, DocumentStatus, User
from schemas import DocumentOut, DocumentUpdate, SemanticSearchResult

router = APIRouter(prefix="/documents", tags=["documents"])


def _user_upload_dir(user_id: int) -> str:
    path = os.path.join(config.UPLOAD_DIR, str(user_id))
    os.makedirs(path, exist_ok=True)
    return path


def _get_owned_document(db: Session, document_id: int, user: User) -> Document:
    doc = db.get(Document, document_id)
    if doc is None or doc.user_id != user.id:
        raise not_found("Document")
    return doc


@router.post("", response_model=DocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    collection_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_bytes = await file.read()

    try:
        ext = validate_upload(file.filename, file_bytes)
    except FileTooLargeError as exc:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(exc))
    except UnsupportedFileError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if collection_id is not None:
        from models import Collection

        coll = db.get(Collection, collection_id)
        if coll is None or coll.user_id != current_user.id:
            raise not_found("Collection")

    file_hash = content_hash(file_bytes)
    existing = (
        db.query(Document)
        .filter(Document.user_id == current_user.id, Document.content_hash == file_hash)
        .first()
    )
    if existing is not None and existing.status == DocumentStatus.ready:
        out = DocumentOut.model_validate(existing)
        out.duplicate = True
        return out

    doc = existing or Document(
        user_id=current_user.id,
        display_name=file.filename,
        original_filename=file.filename,
        file_path="",
        content_hash=file_hash,
        file_type=ext.lstrip("."),
        file_size_bytes=len(file_bytes),
        status=DocumentStatus.pending,
        collection_id=collection_id,
    )
    if existing is not None:
        # Retrying a previously-failed upload of the same bytes.
        doc.status = DocumentStatus.pending
        doc.status_error = None
        doc.collection_id = collection_id
    else:
        db.add(doc)
    db.commit()
    db.refresh(doc)

    stored_name = f"{doc.id}_{safe_filename(file.filename)}"
    file_path = os.path.join(_user_upload_dir(current_user.id), stored_name)

    try:
        doc.status = DocumentStatus.processing
        db.commit()

        with open(file_path, "wb") as f:
            f.write(file_bytes)
        doc.file_path = file_path

        pages = extract_pages(ext, file_bytes)
        chunk_count = rag.ingest_document(
            user_id=current_user.id,
            document_id=doc.id,
            filename=doc.display_name,
            pages=pages,
            collection_id=collection_id,
        )

        from datetime import datetime, timezone

        doc.page_count = len(pages) if ext == ".pdf" else None
        doc.chunk_count = chunk_count
        doc.status = DocumentStatus.ready
        doc.status_error = None
        doc.processed_at = datetime.now(timezone.utc)
    except ExtractionError as exc:
        doc.status = DocumentStatus.failed
        doc.status_error = str(exc)
    except Exception as exc:  # noqa: BLE001 — any embedding/Chroma failure must not crash the request
        doc.status = DocumentStatus.failed
        doc.status_error = f"Processing failed: {exc}"

    db.commit()
    db.refresh(doc)
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(
    collection_id: int | None = None,
    status_filter: DocumentStatus | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Document).filter(Document.user_id == current_user.id)
    if collection_id is not None:
        query = query.filter(Document.collection_id == collection_id)
    if status_filter is not None:
        query = query.filter(Document.status == status_filter)
    if q:
        query = query.filter(Document.display_name.ilike(f"%{q}%"))
    return query.order_by(Document.uploaded_at.desc()).all()


@router.get("/semantic-search", response_model=list[SemanticSearchResult])
def semantic_search_documents(
    q: str,
    limit: int = 8,
    current_user: User = Depends(get_current_user),
):
    """Searches the actual content of every one of the user's documents
    (not just filenames) by reusing the same embed-and-retrieve path the
    chat endpoint uses -- already scoped to `current_user.id` and already
    distance-thresholded (irrelevant chunks are dropped, same as chat).
    Results are grouped by document, keeping each document's best-ranked
    (closest) chunk as its representative snippet."""
    if not q.strip():
        return []

    chunks = rag.retrieve_chunks(q, current_user.id, document_ids=None, top_k=limit * 4)

    best_by_document: dict[int, dict] = {}
    for chunk in chunks:
        doc_id = chunk["document_id"]
        if doc_id not in best_by_document or chunk["distance"] < best_by_document[doc_id]["distance"]:
            best_by_document[doc_id] = chunk

    ranked = sorted(best_by_document.values(), key=lambda c: c["distance"])[:limit]
    return [
        SemanticSearchResult(
            document_id=c["document_id"],
            document_name=c["source"],
            snippet=c["text"][:280] + ("…" if len(c["text"]) > 280 else ""),
            page_number=c.get("page_number"),
            distance=c["distance"],
        )
        for c in ranked
    ]


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return _get_owned_document(db, document_id, current_user)


@router.get("/{document_id}/file")
def open_document_file(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Serves the original uploaded bytes — the "Open" action on the
    document detail page. Ownership-gated like every other document route,
    unlike a static file server which would leak files by URL alone."""
    doc = _get_owned_document(db, document_id, current_user)
    if not doc.file_path or not os.path.exists(doc.file_path):
        raise not_found("Document file")
    return FileResponse(doc.file_path, filename=doc.original_filename)


@router.patch("/{document_id}", response_model=DocumentOut)
def update_document(
    document_id: int,
    req: DocumentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = _get_owned_document(db, document_id, current_user)
    data = req.model_dump(exclude_unset=True)

    if "display_name" in data and data["display_name"]:
        doc.display_name = data["display_name"]

    if "collection_id" in data:
        new_collection_id = data["collection_id"]
        if new_collection_id is not None:
            from models import Collection

            coll = db.get(Collection, new_collection_id)
            if coll is None or coll.user_id != current_user.id:
                raise not_found("Collection")
        doc.collection_id = new_collection_id
        if doc.status == DocumentStatus.ready:
            rag.update_document_collection(doc.id, current_user.id, new_collection_id)

    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_document(document_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    doc = _get_owned_document(db, document_id, current_user)

    rag.delete_document_chunks(doc.id, current_user.id)
    if doc.file_path and os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
