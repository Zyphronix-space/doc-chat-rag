from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

import chat_logic
import config
import db as db_module
import rag
from db import get_db
from deps import get_current_user, get_gemini_client, not_found
from models import (
    Conversation,
    Document,
    DocumentStatus,
    Message,
    MessageRole,
    ScopeType,
    Source,
    User,
)
from schemas import (
    ChatMessageRequest,
    ConversationCreate,
    ConversationDetailOut,
    ConversationOut,
    ConversationUpdate,
    MessageOut,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _get_owned_conversation(db: Session, conversation_id: int, user: User) -> Conversation:
    conv = db.get(Conversation, conversation_id)
    if conv is None or conv.user_id != user.id:
        raise not_found("Conversation")
    return conv


def _to_out(conv: Conversation) -> ConversationOut:
    out = ConversationOut.model_validate(conv)
    out.scope_document_ids = [d.id for d in conv.scope_documents]
    return out


def _validate_and_apply_scope(
    db: Session, conv: Conversation, user: User, scope_type: ScopeType, document_ids: list[int] | None, collection_id: int | None
) -> None:
    conv.scope_type = scope_type
    if scope_type == ScopeType.collection:
        if collection_id is None:
            raise HTTPException(status_code=400, detail="collection_id is required when scope_type is 'collection'")
        from models import Collection

        coll = db.get(Collection, collection_id)
        if coll is None or coll.user_id != user.id:
            raise not_found("Collection")
        conv.scope_collection_id = collection_id
        conv.scope_documents = []
    else:
        if not document_ids:
            raise HTTPException(status_code=400, detail="document_ids is required when scope_type is 'document_set'")
        docs = db.query(Document).filter(Document.id.in_(document_ids), Document.user_id == user.id).all()
        if len(docs) != len(set(document_ids)):
            raise not_found("Document")
        conv.scope_documents = docs
        conv.scope_collection_id = None


def _resolve_scope_documents(db: Session, conv: Conversation, user: User) -> list[Document]:
    """Ready-only documents currently in scope — resolved fresh from SQL each
    time (not cached Chroma metadata) so a collection scope always reflects
    the collection's *current* membership, and never includes a document
    that's still processing or failed."""
    if conv.scope_type == ScopeType.collection:
        docs = (
            db.query(Document)
            .filter(
                Document.collection_id == conv.scope_collection_id,
                Document.user_id == user.id,
                Document.status == DocumentStatus.ready,
            )
            .all()
        )
    else:
        ids = [d.id for d in conv.scope_documents]
        docs = (
            db.query(Document)
            .filter(Document.id.in_(ids), Document.user_id == user.id, Document.status == DocumentStatus.ready)
            .all()
            if ids
            else []
        )
    return docs


@router.post("", response_model=ConversationOut, status_code=status.HTTP_201_CREATED)
def create_conversation(req: ConversationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = Conversation(user_id=current_user.id, title=req.title or "New conversation", scope_type=req.scope_type)
    db.add(conv)
    db.flush()
    _validate_and_apply_scope(db, conv, current_user, req.scope_type, req.document_ids, req.collection_id)
    db.commit()
    db.refresh(conv)
    return _to_out(conv)


@router.get("", response_model=list[ConversationOut])
def list_conversations(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    convs = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .all()
    )
    return [_to_out(c) for c in convs]


@router.get("/{conversation_id}", response_model=ConversationDetailOut)
def get_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = _get_owned_conversation(db, conversation_id, current_user)
    out = ConversationDetailOut.model_validate(conv)
    out.scope_document_ids = [d.id for d in conv.scope_documents]
    out.messages = [_message_to_out(m) for m in conv.messages]
    return out


def _message_to_out(m: Message) -> MessageOut:
    out = MessageOut.model_validate(m)
    for s, so in zip(m.sources, out.sources):
        so.document_name = s.document.display_name if s.document else "(deleted document)"
    return out


@router.get("/{conversation_id}/messages", response_model=list[MessageOut])
def list_messages(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = _get_owned_conversation(db, conversation_id, current_user)
    return [_message_to_out(m) for m in conv.messages]


@router.patch("/{conversation_id}", response_model=ConversationOut)
def update_conversation(
    conversation_id: int,
    req: ConversationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = _get_owned_conversation(db, conversation_id, current_user)
    data = req.model_dump(exclude_unset=True)

    if "title" in data and data["title"]:
        conv.title = data["title"]

    if "scope_type" in data and data["scope_type"] is not None:
        _validate_and_apply_scope(
            db, conv, current_user, data["scope_type"], data.get("document_ids"), data.get("collection_id")
        )

    db.commit()
    db.refresh(conv)
    return _to_out(conv)


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_conversation(conversation_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    conv = _get_owned_conversation(db, conversation_id, current_user)
    db.delete(conv)
    db.commit()


@router.post("/{conversation_id}/messages")
def post_message(
    conversation_id: int,
    req: ChatMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    gemini_client=Depends(get_gemini_client),
):
    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if gemini_client is None:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured on the server")

    conv = _get_owned_conversation(db, conversation_id, current_user)
    scope_docs = _resolve_scope_documents(db, conv, current_user)
    scope_doc_ids = [d.id for d in scope_docs]
    name_by_id = {d.id: d.display_name for d in scope_docs}

    user_message = Message(conversation_id=conv.id, role=MessageRole.user, content=req.question)
    db.add(user_message)
    conv.updated_at = datetime.now(timezone.utc)
    db.commit()

    target_name = chat_logic.find_mentioned_source(req.question, list(name_by_id.values()))
    if target_name:
        target_id = next(doc_id for doc_id, name in name_by_id.items() if name == target_name)
        chunks = rag.get_document_chunks(target_id, current_user.id)
    elif chat_logic.WHOLE_DOC_INTENT_RE.search(req.question) and len(scope_doc_ids) == 1:
        chunks = rag.get_document_chunks(scope_doc_ids[0], current_user.id)
    elif scope_doc_ids:
        chunks = rag.retrieve_chunks(req.question, current_user.id, document_ids=scope_doc_ids)
    else:
        chunks = []

    citations = chat_logic.build_citations(chunks)
    prompt = chat_logic.build_prompt(req.question, chunks, has_scope=bool(scope_doc_ids))
    conversation_id_ = conv.id
    think_longer = req.think_longer

    def generate():
        accumulated = []
        stream = chat_logic.stream_answer(gemini_client, config.GEMINI_MODEL, prompt, citations, think_longer)
        for index, piece in enumerate(stream):
            if index > 0:  # index 0 is the citations metadata line, not answer text
                accumulated.append(piece)
            yield piece

        # A fresh session, looked up via the db module (not imported by name)
        # so tests can monkeypatch db.SessionLocal to their isolated test
        # engine — this generator runs after the endpoint has already
        # returned, so it can't reuse the request-scoped Depends(get_db)
        # session, which FastAPI tears down right after that return.
        persist_db = db_module.SessionLocal()
        try:
            assistant_message = Message(
                conversation_id=conversation_id_,
                role=MessageRole.assistant,
                content="".join(accumulated),
                think_longer=think_longer,
            )
            persist_db.add(assistant_message)
            persist_db.flush()

            for c in citations:
                persist_db.add(
                    Source(
                        message_id=assistant_message.id,
                        document_id=c["document_id"],
                        chunk_id=c["chunk_id"],
                        chunk_index=c["chunk_index"],
                        page_number=c.get("page_number"),
                        snippet=c["snippet"],
                        distance=c.get("distance"),
                        rank=c["rank"],
                    )
                )

            conv_row = persist_db.get(Conversation, conversation_id_)
            if conv_row is not None:
                conv_row.updated_at = datetime.now(timezone.utc)

            persist_db.commit()
        finally:
            persist_db.close()

    return StreamingResponse(generate(), media_type="text/plain")
