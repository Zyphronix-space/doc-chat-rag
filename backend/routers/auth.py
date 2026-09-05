from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

import auth
import config
import rag
from auth import create_access_token, hash_password, verify_password
from db import get_db
from deps import get_current_user
from models import Document, PasswordResetToken, User
from ratelimit import rate_limit
from schemas import (
    ChangePasswordRequest,
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
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    user = User(email=req.email, hashed_password=hash_password(req.password))
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
    """Always returns 200 with a generic message so the response shape alone
    doesn't confirm whether the email is registered. When it is, a reset
    link is generated -- but since this project has no mail provider
    configured (see README), that link is returned directly in
    demo_reset_link instead of being emailed. That's a deliberate, disclosed
    tradeoff for a demo deployment, not something a production system should
    do (a real deployment would email the link and never return it here)."""
    generic = ForgotPasswordResponse(message="if that email is registered, a reset link has been generated")

    user = db.query(User).filter(User.email == req.email).first()
    if user is None:
        return generic

    token = auth.generate_reset_token()
    expires_at = datetime.now(timezone.utc) + auth.RESET_TOKEN_TTL
    db.add(PasswordResetToken(user_id=user.id, token_hash=auth.hash_token(token), expires_at=expires_at))
    db.commit()

    return ForgotPasswordResponse(
        message="a reset link has been generated",
        demo_reset_link=f"{config.FRONTEND_URL}/reset-password?token={token}",
        expires_in_minutes=int(auth.RESET_TOKEN_TTL.total_seconds() // 60),
    )


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
def delete_account(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Chroma doesn't know about SQL cascades -- clear each document's chunks
    # before the cascading delete removes the Document rows themselves.
    doc_ids = [d.id for d in db.query(Document).filter(Document.user_id == current_user.id).all()]
    for doc_id in doc_ids:
        rag.delete_document_chunks(doc_id, current_user.id)

    db.delete(current_user)
    db.commit()
    return {"message": "account deleted"}
