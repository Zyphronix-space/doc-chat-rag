from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from deps import get_current_user
from models import Collection, Conversation, Document, DocumentStatus, Message, MessageRole, User
from routers.conversations import _to_out as conversation_to_out
from schemas import DashboardAnalytics, DashboardRecent, DashboardSummary, DayCount, DocumentOut

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


@router.get("/analytics", response_model=DashboardAnalytics)
def analytics(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Real usage analytics, computed straight from SQL — never fabricated.
    Distinct from /eval, which measures the model itself (retrieval hit-rate
    / faithfulness), not what this account has actually been asking."""
    docs = db.query(Document).filter(Document.user_id == current_user.id)
    documents_by_status = {s.value: docs.filter(Document.status == s).count() for s in DocumentStatus}

    total_questions_asked = (
        db.query(Message)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(Conversation.user_id == current_user.id, Message.role == MessageRole.user)
        .count()
    )

    since = datetime.now(timezone.utc) - timedelta(days=29)
    rows = (
        db.query(Message.created_at)
        .join(Conversation, Message.conversation_id == Conversation.id)
        .filter(
            Conversation.user_id == current_user.id,
            Message.role == MessageRole.user,
            Message.created_at >= since,
        )
        .all()
    )
    by_day: dict[str, int] = {}
    for (created_at,) in rows:
        key = created_at.date().isoformat()
        by_day[key] = by_day.get(key, 0) + 1

    messages_over_time = []
    for offset in range(29, -1, -1):
        d = (date.today() - timedelta(days=offset)).isoformat()
        messages_over_time.append(DayCount(date=d, count=by_day.get(d, 0)))

    return DashboardAnalytics(
        documents_by_status=documents_by_status,
        total_questions_asked=total_questions_asked,
        messages_over_time=messages_over_time,
    )
