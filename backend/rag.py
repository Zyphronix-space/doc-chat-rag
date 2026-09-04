"""Document ingestion and retrieval for the RAG pipeline.

Chunking uses LangChain's RecursiveCharacterTextSplitter; embedding, storage,
and retrieval are done directly against Chroma so the actual RAG mechanics
aren't hidden behind a chain abstraction.

Every chunk is tagged with `user_id` and `document_id` metadata so retrieval
can be scoped per-user (always) and per-document/collection (when a
conversation is scoped to specific documents) via Chroma's `where` filter —
Chroma itself has no notion of users or documents, this file is what makes
it behave like a multi-tenant store.
"""

import uuid

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

import config

COLLECTION_NAME = "documents"
# Chunks farther than this (squared L2, on MiniLM embeddings) are treated as
# irrelevant to the query and dropped — keeps casual messages ("hi", "thanks")
# from being force-fit into an unrelated document excerpt.
MAX_RELEVANT_DISTANCE = 1.6

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
client = chromadb.PersistentClient(path=config.CHROMA_PATH)
collection = client.get_or_create_collection(COLLECTION_NAME)


def _splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)


def ingest_document(
    user_id: int,
    document_id: int,
    filename: str,
    pages: list[tuple[int | None, str]],
    collection_id: int | None = None,
) -> int:
    """Chunk per page (so real page numbers survive into chunk metadata),
    embed, and store. Returns the total chunk count across all pages."""
    splitter = _splitter()
    all_chunks: list[str] = []
    all_metadatas: list[dict] = []
    chunk_index = 0

    for page_number, page_text in pages:
        if not page_text or not page_text.strip():
            continue
        page_chunks = splitter.split_text(page_text)
        for text in page_chunks:
            meta = {
                "user_id": user_id,
                "document_id": document_id,
                "source": filename,
                "chunk_index": chunk_index,
            }
            if page_number is not None:
                meta["page_number"] = page_number
            if collection_id is not None:
                meta["collection_id"] = collection_id
            all_chunks.append(text)
            all_metadatas.append(meta)
            chunk_index += 1

    if not all_chunks:
        return 0

    embeddings = embedding_model.encode(all_chunks).tolist()
    ids = [str(uuid.uuid4()) for _ in all_chunks]
    collection.add(ids=ids, embeddings=embeddings, documents=all_chunks, metadatas=all_metadatas)
    return len(all_chunks)


def _scope_where(user_id: int, document_ids: list[int] | None = None) -> dict:
    clauses: list[dict] = [{"user_id": user_id}]
    if document_ids is not None:
        clauses.append({"document_id": {"$in": document_ids}})
    return clauses[0] if len(clauses) == 1 else {"$and": clauses}


def retrieve_chunks(
    question: str,
    user_id: int,
    document_ids: list[int] | None = None,
    top_k: int = 4,
) -> list[dict]:
    query_embedding = embedding_model.encode([question]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        where=_scope_where(user_id, document_ids),
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        return []

    return [
        {
            "text": doc,
            "source": meta["source"],
            "document_id": meta["document_id"],
            "chunk_id": chunk_id,
            "chunk_index": meta["chunk_index"],
            "page_number": meta.get("page_number"),
            "distance": distance,
        }
        for doc, meta, distance, chunk_id in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
            results["ids"][0],
        )
        if distance <= MAX_RELEVANT_DISTANCE
    ]


def get_document_chunks(document_id: int, user_id: int, limit: int = 80) -> list[dict]:
    """All chunks for one document, in original order — used for whole-document
    intents (summarize/explain/etc.) where top-k similarity search would only
    surface a handful of chunks out of a much longer document."""
    data = collection.get(
        where=_scope_where(user_id, [document_id]),
        include=["documents", "metadatas"],
    )
    triples = sorted(
        zip(data["documents"], data["metadatas"], data["ids"]),
        key=lambda p: p[1]["chunk_index"],
    )
    return [
        {
            "text": doc,
            "source": meta["source"],
            "document_id": meta["document_id"],
            "chunk_id": chunk_id,
            "chunk_index": meta["chunk_index"],
            "page_number": meta.get("page_number"),
            "distance": None,
        }
        for doc, meta, chunk_id in triples[:limit]
    ]


def delete_document_chunks(document_id: int, user_id: int) -> None:
    collection.delete(where=_scope_where(user_id, [document_id]))


def update_document_collection(document_id: int, user_id: int, collection_id: int | None) -> None:
    """Refresh the `collection_id` metadata on every chunk of a document after
    it's moved — otherwise collection-scoped retrieval would miss chunks
    still tagged with the document's previous (or no) collection."""
    data = collection.get(where=_scope_where(user_id, [document_id]), include=["metadatas"])
    if not data["ids"]:
        return
    new_metadatas = []
    for meta in data["metadatas"]:
        meta = dict(meta)
        if collection_id is not None:
            meta["collection_id"] = collection_id
        else:
            meta.pop("collection_id", None)
        new_metadatas.append(meta)
    collection.update(ids=data["ids"], metadatas=new_metadatas)
