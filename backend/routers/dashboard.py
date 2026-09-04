from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import Collection, Conversation, Document, DocumentStatus, User
from routers.conversations import _to_out as conversation_to_out
from schemas import DashboardRecent, DashboardSummary, DocumentOut

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    docs = db.query(Document).filter(Document.user_id == current_user.id)
    return DashboardSummary(
        total_documents=docs.count(),
        total_collections=db.query(Collection).filter(Collection.user_id == current_user.id).count(),
        total_conversations=db.query(Conversation).filter(Conversation.user_id == current_user.id).count(),
        documents_ready=docs.filter(Document.status == DocumentStatus.ready).count(),
        documents_failed=docs.filter(Document.status == DocumentStatus.failed).count(),
    )


@router.get("/recent", response_model=DashboardRecent)
def recent(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    recent_documents = (
        db.query(Document)
        .filter(Document.user_id == current_user.id)
        .order_by(Document.uploaded_at.desc())
        .limit(5)
        .all()
    )
    recent_conversations = (
        db.query(Conversation)
        .filter(Conversation.user_id == current_user.id)
        .order_by(Conversation.updated_at.desc())
        .limit(5)
        .all()
    )
    return DashboardRecent(
        recent_documents=[DocumentOut.model_validate(d) for d in recent_documents],
        recent_conversations=[conversation_to_out(c) for c in recent_conversations],
    )
