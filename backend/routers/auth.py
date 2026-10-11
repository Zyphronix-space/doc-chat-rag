from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import config
import mailer
import rag
from auth import create_access_token, hash_password, verify_password
from db import get_db
from deps import get_current_user
from models import Document, PasswordResetToken, User
from ratelimit import rate_limit
from schemas import (
    ChangePasswordRequest,
    DeleteAccountRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit("register", max_requests=10, window_seconds=60))],
)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if req.accept_terms is not True:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must confirm you're 18 or older and accept the Terms of Service",
        )
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(
        email=req.email,
        hashed_password=hash_password(req.password),
        terms_version=config.TERMS_VERSION,
        terms_accepted_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit("login", max_requests=10, window_seconds=60))],
)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if user is None or not verify_password(req.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token(user.id)
    return TokenResponse(access_token=token, user=user)


@router.post("/logout")
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT — nothing to invalidate server-side. The client discards
    # its token; tokens simply expire on their own after JWT_EXPIRE_MINUTES.
    return {"status": "logged out"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    dependencies=[Depends(rate_limit("forgot-password", max_requests=5, window_seconds=60))],
)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Returns the same response whether or not the email is registered, so
    it can't be used to discover accounts. The reset link is emailed when
    SMTP is configured. Only in PASSWORD_RESET_DEMO_MODE (local development)
    is it returned in the response instead -- never on a real deployment,
    since that would let anyone reset anyone's password."""
    if mailer.email_configured():
        delivery = "email"
    elif config.PASSWORD_RESET_DEMO_MODE:
        delivery = "demo"
    else:
        delivery = "unavailable"
    ttl_minutes = int(auth.RESET_TOKEN_TTL.total_seconds() // 60)
    response = ForgotPasswordResponse(
        message="If that email is registered, a reset link has been sent to it."
        if delivery != "unavailable"
        else "Password reset by email isn't available on this deployment yet.",
        delivery=delivery,
        expires_in_minutes=ttl_minutes,
    )

    user = db.query(User).filter(User.email == req.email).first()
    if user is None or delivery == "unavailable":
        return response

    token = auth.generate_reset_token()
    expires_at = datetime.now(timezone.utc) + auth.RESET_TOKEN_TTL
    db.add(PasswordResetToken(user_id=user.id, token_hash=auth.hash_token(token), expires_at=expires_at))
    db.commit()
    link = f"{config.FRONTEND_URL}/reset-password?token={token}"

    if delivery == "email":
        try:
            mailer.send_password_reset(user.email, link, ttl_minutes)
        except Exception:  # noqa: BLE001 — don't reveal delivery failures per-address
            print("password reset email failed to send")  # no address or token in logs
    else:
        response.demo_reset_link = link
    return response


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    token_hash = auth.hash_token(req.token)
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token_hash == token_hash).first()
    if record is None:
        raise HTTPException(status_code=400, detail="Invalid or expired reset link")
    if record.used_at is not None:
        raise HTTPException(status_code=400, detail="This reset link has already been used")
    # SQLite doesn't actually preserve tzinfo through a round trip (unlike
    # Postgres) -- DateTime(timezone=True) columns come back naive here, so
    # this always wrote UTC and must treat a naive read the same way.
    expires_at = record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="This reset link has expired")

    user = db.get(User, record.user_id)
    user.hashed_password = hash_password(req.new_password)
    record.used_at = datetime.now(timezone.utc)
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id, PasswordResetToken.id != record.id
    ).delete()
    db.commit()
    return {"message": "password has been reset"}


@router.patch("/change-password")
def change_password(
    req: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(req.new_password)
    db.commit()
    return {"message": "password changed"}


@router.delete("/me")
def delete_account(
    req: DeleteAccountRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Permanently deletes the account and everything tied to it: documents
    (including their stored bytes), extracted chunks and embeddings,
    collections, conversations, messages, citations, eval cases and reset
    tokens. Requires the current password so a stolen session token alone
    can't destroy an account."""
    if not verify_password(req.password, current_user.hashed_password):
        raise HTTPException(status_code=403, detail="Password is incorrect")

    # Clear chunks explicitly -- SQLite doesn't enforce the FK cascade, and
    # the ORM cascade only covers relationships it knows about.
    doc_ids = [d.id for d in db.query(Document).filter(Document.user_id == current_user.id).all()]
    for doc_id in doc_ids:
        rag.delete_document_chunks(doc_id, current_user.id)

    db.delete(current_user)
    db.commit()
    return {"message": "account deleted"}


@router.get("/me/export")
def export_my_data(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Everything DocMind stores about the current user, as JSON (right of
    access / portability). Original files aren't inlined -- each document
    lists the route to download it; the extracted text is included."""
    from models import Chunk, Collection, Conversation, EvalCase

    def iso(dt):
        return dt.isoformat() if dt else None

    chunks_by_doc: dict[int, list[dict]] = {}
    for c in (
        db.query(Chunk).filter(Chunk.user_id == current_user.id).order_by(Chunk.document_id, Chunk.chunk_index)
    ):
        chunks_by_doc.setdefault(c.document_id, []).append(
            {"chunk_index": c.chunk_index, "page_number": c.page_number, "text": c.text}
        )

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {
            "email": current_user.email,
            "created_at": iso(current_user.created_at),
            "terms_version": current_user.terms_version,
            "terms_accepted_at": iso(current_user.terms_accepted_at),
        },
        "documents": [
            {
                "id": d.id,
                "display_name": d.display_name,
                "original_filename": d.original_filename,
                "file_type": d.file_type,
                "file_size_bytes": d.file_size_bytes,
                "status": d.status.value,
                "collection_id": d.collection_id,
                "uploaded_at": iso(d.uploaded_at),
                "download_path": f"/documents/{d.id}/file",
                "extracted_chunks": chunks_by_doc.get(d.id, []),
            }
            for d in db.query(Document).filter(Document.user_id == current_user.id)
        ],
        "collections": [
            {"id": c.id, "name": c.name, "description": c.description, "created_at": iso(c.created_at)}
            for c in db.query(Collection).filter(Collection.user_id == current_user.id)
        ],
        "conversations": [
            {
                "id": conv.id,
                "title": conv.title,
                "created_at": iso(conv.created_at),
                "messages": [
                    {
                        "role": m.role.value,
                        "content": m.content,
                        "created_at": iso(m.created_at),
                        "citations": [
                            {"document_id": s.document_id, "page_number": s.page_number, "snippet": s.snippet}
                            for s in m.sources
                        ],
                    }
                    for m in conv.messages
                ],
            }
            for conv in db.query(Conversation).filter(Conversation.user_id == current_user.id)
        ],
        "eval_cases": [
            {"question": e.question, "expected_answer": e.expected_answer, "created_at": iso(e.created_at)}
            for e in db.query(EvalCase).filter(EvalCase.user_id == current_user.id)
        ],
    }
