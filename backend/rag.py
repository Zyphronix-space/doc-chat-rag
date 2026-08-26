"""Document ingestion and retrieval for the RAG pipeline.

Chunking uses LangChain's RecursiveCharacterTextSplitter; embedding, storage,
and retrieval are done directly against Chroma so the actual RAG mechanics
aren't hidden behind a chain abstraction.
"""

import uuid

import chromadb
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

CHROMA_PATH = "chroma_db"
COLLECTION_NAME = "documents"
# Chunks farther than this (squared L2, on MiniLM embeddings) are treated as
# irrelevant to the query and dropped — keeps casual messages ("hi", "thanks")
# from being force-fit into an unrelated document excerpt.
MAX_RELEVANT_DISTANCE = 1.6

embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(COLLECTION_NAME)

splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)


def ingest_document(filename: str, text: str) -> int:
    chunks = splitter.split_text(text)
    if not chunks:
        return 0

    embeddings = embedding_model.encode(chunks).tolist()
    ids = [str(uuid.uuid4()) for _ in chunks]
    metadatas = [{"source": filename, "chunk_index": i} for i in range(len(chunks))]

    collection.add(ids=ids, embeddings=embeddings, documents=chunks, metadatas=metadatas)
    return len(chunks)


def retrieve_chunks(question: str, top_k: int = 4) -> list[dict]:
    query_embedding = embedding_model.encode([question]).tolist()
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    if not results["documents"] or not results["documents"][0]:
        return []

    return [
        {"text": doc, "source": meta["source"]}
        for doc, meta, distance in zip(
            results["documents"][0], results["metadatas"][0], results["distances"][0]
        )
        if distance <= MAX_RELEVANT_DISTANCE
    ]


def list_sources() -> list[str]:
    data = collection.get()
    if not data["metadatas"]:
        return []
    return sorted({meta["source"] for meta in data["metadatas"]})


def delete_source(filename: str) -> None:
    collection.delete(where={"source": filename})


def reset_collection() -> None:
    global collection
    client.delete_collection(COLLECTION_NAME)
    collection = client.get_or_create_collection(COLLECTION_NAME)
