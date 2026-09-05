"""GET /sources — browse every citation ever produced across all of the
user's conversations, not scoped to a single conversation like
Message.sources is. Backs the Sources page: "what has DocMind actually
cited, and where from" as a searchable ledger, distinct from the live
per-conversation citations already shown in the chat UI."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import Conversation, Document, Message, Source, User
from schemas import SourceListItem

router = APIRouter(prefix="/sources", tags=["sources"])


@router.get("", response_model=list[SourceListItem])
def list_sources(
    document_id: int | None = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = (
        db.query(Source, Document.display_name, Conversation.id, Conversation.title, Message.created_at)
        .join(Document, Source.document_id == Document.id)
        .join(Message, Source.message_id == Message.id)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == current_user.id)
    )
    if document_id is not None:
        query = query.filter(Source.document_id == document_id)

    rows = query.order_by(Message.created_at.desc()).offset(offset).limit(limit).all()

    return [
        SourceListItem(
            id=source.id,
            document_id=source.document_id,
            document_name=document_name,
            conversation_id=conversation_id,
            conversation_title=conversation_title,
            message_id=source.message_id,
            page_number=source.page_number,
            snippet=source.snippet,
            distance=source.distance,
            created_at=created_at,
        )
        for source, document_name, conversation_id, conversation_title, created_at in rows
    ]
