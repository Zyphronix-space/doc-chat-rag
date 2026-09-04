from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

import rag
from db import get_db
from deps import get_current_user, not_found
from models import Collection, Document, DocumentStatus, User
from schemas import CollectionCreate, CollectionDetailOut, CollectionOut, CollectionUpdate, DocumentOut

router = APIRouter(prefix="/collections", tags=["collections"])


def _get_owned_collection(db: Session, collection_id: int, user: User) -> Collection:
    coll = db.get(Collection, collection_id)
    if coll is None or coll.user_id != user.id:
        raise not_found("Collection")
    return coll


def _to_out(db: Session, coll: Collection) -> CollectionOut:
    count = db.query(Document).filter(Document.collection_id == coll.id).count()
    out = CollectionOut.model_validate(coll)
    out.document_count = count
    return out


@router.post("", response_model=CollectionOut, status_code=status.HTTP_201_CREATED)
def create_collection(req: CollectionCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    coll = Collection(user_id=current_user.id, name=req.name, description=req.description)
    db.add(coll)
    db.commit()
    db.refresh(coll)
    return _to_out(db, coll)


@router.get("", response_model=list[CollectionOut])
def list_collections(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    colls = db.query(Collection).filter(Collection.user_id == current_user.id).order_by(Collection.name).all()
    return [_to_out(db, c) for c in colls]


@router.get("/{collection_id}", response_model=CollectionDetailOut)
def get_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    coll = _get_owned_collection(db, collection_id, current_user)
    out = CollectionDetailOut.model_validate(coll)
    out.document_count = len(coll.documents)
    out.documents = [DocumentOut.model_validate(d) for d in coll.documents]
    return out


@router.patch("/{collection_id}", response_model=CollectionOut)
def update_collection(
    collection_id: int,
    req: CollectionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = _get_owned_collection(db, collection_id, current_user)
    data = req.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        coll.name = data["name"]
    if "description" in data:
        coll.description = data["description"]
    db.commit()
    db.refresh(coll)
    return _to_out(db, coll)


@router.delete("/{collection_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_collection(collection_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    coll = _get_owned_collection(db, collection_id, current_user)

    # Deleting a folder un-files its documents rather than destroying them —
    # matches the FK's ondelete=SET NULL, but Chroma metadata needs the same
    # update explicitly (it doesn't know about SQL foreign keys).
    docs = db.query(Document).filter(Document.collection_id == coll.id).all()
    for doc in docs:
        if doc.status == DocumentStatus.ready:
            rag.update_document_collection(doc.id, current_user.id, None)

    db.delete(coll)
    db.commit()


@router.post("/{collection_id}/documents", response_model=CollectionDetailOut)
def add_document_to_collection(
    collection_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = _get_owned_collection(db, collection_id, current_user)
    doc = db.get(Document, document_id)
    if doc is None or doc.user_id != current_user.id:
        raise not_found("Document")

    doc.collection_id = coll.id
    if doc.status == DocumentStatus.ready:
        rag.update_document_collection(doc.id, current_user.id, coll.id)
    db.commit()
    db.refresh(coll)

    out = CollectionDetailOut.model_validate(coll)
    out.document_count = len(coll.documents)
    out.documents = [DocumentOut.model_validate(d) for d in coll.documents]
    return out


@router.delete("/{collection_id}/documents/{document_id}", response_model=CollectionDetailOut)
def remove_document_from_collection(
    collection_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    coll = _get_owned_collection(db, collection_id, current_user)
    doc = db.get(Document, document_id)
    if doc is None or doc.user_id != current_user.id or doc.collection_id != coll.id:
        raise not_found("Document")

    doc.collection_id = None
    if doc.status == DocumentStatus.ready:
        rag.update_document_collection(doc.id, current_user.id, None)
    db.commit()
    db.refresh(coll)

    out = CollectionDetailOut.model_validate(coll)
    out.document_count = len(coll.documents)
    out.documents = [DocumentOut.model_validate(d) for d in coll.documents]
    return out
