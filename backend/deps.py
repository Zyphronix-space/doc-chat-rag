"""Shared FastAPI dependencies: current user, ownership checks, Gemini client."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from google import genai
from sqlalchemy.orm import Session

import config
from auth import decode_access_token
from db import get_db
from models import User

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    user_id = decode_access_token(credentials.credentials)
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    return user


def not_found(resource: str = "Resource"):
    return HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found")


# The real Gemini client is built once and reused; tests override this
# dependency with a fake so no test needs a real API key or network call.
_gemini_client = genai.Client(api_key=config.GEMINI_API_KEY) if config.GEMINI_API_KEY else None


def get_gemini_client():
    return _gemini_client
