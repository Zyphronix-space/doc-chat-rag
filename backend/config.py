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

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "uploads")
CHROMA_PATH = os.environ.get("CHROMA_PATH", "chroma_db")
MAX_FILE_SIZE_MB = int(os.environ.get("MAX_FILE_SIZE_MB", "20"))
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

CORS_ORIGINS = [
    origin.strip()
    for origin in os.environ.get("CORS_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

JWT_SECRET_WAS_GENERATED = False
if not JWT_SECRET:
    # A dev-only fallback so `uvicorn main:app` still boots without extra setup,
    # but every token issued with it becomes invalid the moment the process
    # restarts (a fresh random secret each time) — production always sets JWT_SECRET.
    import secrets

    JWT_SECRET = secrets.token_hex(32)
    JWT_SECRET_WAS_GENERATED = True
