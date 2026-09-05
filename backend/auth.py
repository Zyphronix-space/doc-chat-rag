"""Password hashing and JWT creation/verification.

Uses `bcrypt` directly (not passlib) — passlib's bcrypt backend probes
`bcrypt.__about__.__version__`, which was removed in bcrypt>=4.1, so it
breaks against the bcrypt version this project installs.
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

import config

RESET_TOKEN_TTL = timedelta(minutes=30)


def generate_reset_token() -> str:
    """A URL-safe random token handed to the caller exactly once. Only its
    hash (below) is ever persisted."""
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    """SHA-256 is fine here (unlike passwords, this token is already
    high-entropy random data, not something a dictionary attack could
    guess) -- same idea as GitHub/Django's reset-token storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=config.JWT_EXPIRE_MINUTES)
    payload = {"sub": str(user_id), "exp": expires_at}
    return jwt.encode(payload, config.JWT_SECRET, algorithm=config.JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    try:
        payload = jwt.decode(token, config.JWT_SECRET, algorithms=[config.JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
