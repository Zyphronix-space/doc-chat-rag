"""Centralized environment configuration."""

import os

from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash-lite")

JWT_SECRET = os.environ.get("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "120"))

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./app.db")

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIM = int(os.environ.get("EMBEDDING_DIM", "768"))
# Cosine distance above which a retrieved chunk counts as irrelevant.
MAX_RELEVANT_DISTANCE = float(os.environ.get("MAX_RELEVANT_DISTANCE", "0.40"))

MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "20"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

# Used to build the password-reset link that gets emailed.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")

# Version of the Terms of Service users accept at signup; bump it whenever
# the Terms change materially (frontend/src/config/site.js shows the same).
TERMS_VERSION = os.environ.get("TERMS_VERSION", "2026-10-11")

# Outgoing SMTP for password-reset email (see mailer.py). Unset = no email.
SMTP_HOST = os.environ.get("SMTP_HOST")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "587"))
SMTP_USER = os.environ.get("SMTP_USER")
SMTP_PASS = os.environ.get("SMTP_PASS")
SMTP_FROM = os.environ.get("SMTP_FROM")

# LOCAL DEVELOPMENT ONLY. Returns the reset link in the HTTP response instead
# of emailing it, which lets anyone who knows an email address take over that
# account. Never enable this on a deployment real people use.
PASSWORD_RESET_DEMO_MODE = os.environ.get("PASSWORD_RESET_DEMO_MODE", "").lower() == "true"

JWT_SECRET_WAS_GENERATED = False
if not JWT_SECRET:
    # A dev-only fallback so `uvicorn main:app` still boots without extra setup,
    # but every token issued with it becomes invalid the moment the process
    # restarts (a fresh random secret each time) — production always sets JWT_SECRET.
    import secrets

    JWT_SECRET = secrets.token_hex(32)
    JWT_SECRET_WAS_GENERATED = True
