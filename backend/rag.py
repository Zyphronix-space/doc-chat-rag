"""Document ingestion and retrieval for the RAG pipeline.

Chunking uses LangChain's RecursiveCharacterTextSplitter; embedding is done
with the Gemini embedding API, and chunks + their vectors live in the same
relational database as everything else (the `chunks` table, see models.py).

On TiDB the embedding column is a native `VECTOR(n)` and similarity search
runs in SQL via `VEC_COSINE_DISTANCE`. On SQLite (local dev / the test
suite) the vector is stored as JSON text and cosine distance is computed in
Python — same results, same API, no extra service needed.

Every query is scoped by `user_id` (always) and by `document_id IN (...)`
when a conversation is scoped to specific documents or a collection — a
chunk query can never cross users even if an authorization check elsewhere
had a bug.
"""

import math
import uuid

from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy import String, bindparam, delete, func, select

import config
import db as db_module
from models import Chunk

# Chunks farther than this (cosine distance, 0 = identical direction) are
# treated as irrelevant to the query and dropped — keeps casual messages
# ("hi", "thanks") from being force-fit into an unrelated document excerpt.
MAX_RELEVANT_DISTANCE = config.MAX_RELEVANT_DISTANCE

_EMBED_BATCH = 100  # Gemini batchEmbedContents caps requests at 100 texts


def _splitter() -> RecursiveCharacterTextSplitter:
    return RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)


_genai_client = None


def embed_texts(texts: list[str], task_type: str) -> list[list[float]]:
    """Embeds texts with Gemini. `task_type` is RETRIEVAL_DOCUMENT for chunks
    and RETRIEVAL_QUERY for questions — asymmetric embeddings separate
    relevant from irrelevant chunks noticeably better than symmetric ones.
    Tests replace this function with a deterministic offline fake."""
    global _genai_client
    from google import genai
    from google.genai import types

    if not config.GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not configured on the server")
    if _genai_client is None:
        _genai_client = genai.Client(api_key=config.GEMINI_API_KEY)

    vectors: list[list[float]] = []
    for start in range(0, len(texts), _EMBED_BATCH):
        result = _genai_client.models.embed_content(
            model=config.EMBEDDING_MODEL,
            contents=texts[start : start + _EMBED_BATCH],
            config=types.EmbedContentConfig(
                task_type=task_type, output_dimensionality=config.EMBEDDING_DIM
            ),
        )
        vectors.extend(_normalize(e.values) for e in result.embeddings)
    return vectors


def _normalize(vec: list[float]) -> list[float]:
    # Gemini only pre-normalizes the full 3072-dim output; truncated
    # (Matryoshka) dimensions must be re-normalized for cosine to behave.
    norm = math.sqrt(sum(v * v for v in vec)) or 1.0
    return [v / norm for v in vec]


def _is_tidb(session) -> bool:
    return session.get_bind().dialect.name == "mysql"


def ingest_document(
    user_id: int,
    document_id: int,
    filename: str,
    pages: list[tuple[int | None, str]],
    collection_id: int | None = None,  # noqa: ARG001 — membership is resolved via SQL at query time
) -> int:
    """Chunk per page (so real page numbers survive into chunk rows), embed,
    and store. Returns the total chunk count across all pages."""
    splitter = _splitter()
    rows: list[dict] = []
    for page_number, page_text in pages:
        if not page_text or not page_text.strip():
            continue
        for chunk_text in splitter.split_text(page_text):
            rows.append({"text": chunk_text, "page_number": page_number})

    if not rows:
        return 0

    embeddings = embed_texts([r["text"] for r in rows], "RETRIEVAL_DOCUMENT")

    session = db_module.SessionLocal()
    try:
        session.execute(delete(Chunk).where(Chunk.document_id == document_id))
        for index, (row, emb) in enumerate(zip(rows, embeddings)):
            session.add(
                Chunk(
                    id=str(uuid.uuid4()),
                    user_id=user_id,
                    document_id=document_id,
                    source=filename,
                    chunk_index=index,
                    page_number=row["page_number"],
                    text=row["text"],
                    embedding=emb,
                )
            )
        session.commit()
    finally:
        session.close()
    return len(rows)


def _chunk_dict(chunk: Chunk, distance: float | None) -> dict:
    return {
        "text": chunk.text,
        "source": chunk.source,
        "document_id": chunk.document_id,
        "chunk_id": chunk.id,
        "chunk_index": chunk.chunk_index,
        "page_number": chunk.page_number,
        "distance": distance,
    }


def _cosine_distance(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1.0
    nb = math.sqrt(sum(y * y for y in b)) or 1.0
    return 1.0 - dot / (na * nb)


def retrieve_chunks(
    question: str,
    user_id: int,
    document_ids: list[int] | None = None,
    top_k: int = 4,
) -> list[dict]:
    if document_ids is not None and not document_ids:
        return []

    query_vec = embed_texts([question], "RETRIEVAL_QUERY")[0]

    session = db_module.SessionLocal()
    try:
        if _is_tidb(session):
            qvec = "[" + ",".join(repr(float(v)) for v in query_vec) + "]"
            distance = func.VEC_COSINE_DISTANCE(Chunk.embedding, bindparam("qvec", qvec, type_=String)).label(
                "distance"
            )
            stmt = select(Chunk, distance).where(Chunk.user_id == user_id)
            if document_ids is not None:
                stmt = stmt.where(Chunk.document_id.in_(document_ids))
            stmt = stmt.order_by(distance).limit(top_k)
            scored = [(chunk, float(dist)) for chunk, dist in session.execute(stmt).all()]
        else:
            stmt = select(Chunk).where(Chunk.user_id == user_id)
            if document_ids is not None:
                stmt = stmt.where(Chunk.document_id.in_(document_ids))
            scored = sorted(
                ((c, _cosine_distance(query_vec, c.embedding)) for c in session.scalars(stmt).all()),
                key=lambda pair: pair[1],
            )[:top_k]

        return [_chunk_dict(c, d) for c, d in scored if d <= MAX_RELEVANT_DISTANCE]
    finally:
        session.close()


def get_document_chunks(document_id: int, user_id: int, limit: int = 80) -> list[dict]:
    """All chunks for one document, in original order — used for whole-document
    intents (summarize/explain/etc.) where top-k similarity search would only
    surface a handful of chunks out of a much longer document."""
    session = db_module.SessionLocal()
    try:
        chunks = session.scalars(
            select(Chunk)
            .where(Chunk.user_id == user_id, Chunk.document_id == document_id)
            .order_by(Chunk.chunk_index)
            .limit(limit)
        ).all()
        return [_chunk_dict(c, None) for c in chunks]
    finally:
        session.close()


def delete_document_chunks(document_id: int, user_id: int) -> None:
    session = db_module.SessionLocal()
    try:
        session.execute(delete(Chunk).where(Chunk.user_id == user_id, Chunk.document_id == document_id))
        session.commit()
    finally:
        session.close()
