import os
import sys
import tempfile
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Must happen before `main`/`rag` are ever imported anywhere in the test
# process — rag.py's Chroma client is a module-level singleton built from
# this env var at import time, so it can only be set once, process-wide.
os.environ.setdefault("CHROMA_PATH", os.path.join(tempfile.mkdtemp(prefix="doc-chat-rag-test-chroma-"), "chroma_db"))
os.environ.setdefault("UPLOAD_DIR", os.path.join(tempfile.mkdtemp(prefix="doc-chat-rag-test-uploads-"), "uploads"))
# The suite registers dozens of throwaway users back-to-back via
# register_and_login -- disable the auth rate limiter globally here so that
# behavior doesn't trip on normal test volume. test_password_reset.py
# re-enables it (via monkeypatch) for the one test that actually exercises it.
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")

import models  # noqa: E402 — registers tables on db.Base before create_all
import db as db_module  # noqa: E402
from db import Base, get_db  # noqa: E402
from deps import get_gemini_client  # noqa: E402


class _FakeTextEvent:
    def __init__(self, text):
        self.text = text


class FakeGeminiClient:
    """Deterministic stand-in for google.genai.Client — no network call, no
    quota use. Tests that need to inspect what prompt Gemini received can
    read `.last_contents` / `.last_config` afterward."""

    def __init__(self, reply="This is a fake grounded answer."):
        self.reply = reply
        self.last_contents = None
        self.last_config = None

        class _Models:
            def generate_content_stream(inner_self, model, contents, config):
                self.last_contents = contents
                self.last_config = config
                words = self.reply.split(" ")
                return iter([_FakeTextEvent(w + " ") for w in words])

        self.models = _Models()


@pytest.fixture(autouse=True)
def reset_chroma():
    """Chroma's persistent client is a module-level singleton shared by the
    whole test process (see the CHROMA_PATH note above), but each test's
    relational DB is a fresh SQLite file whose autoincrement ids restart at
    1 — so without this, two tests' documents could collide on the same
    (user_id, document_id) pair and see each other's chunks. Reset before
    every test instead of relying on unique ids across tests."""
    import rag

    rag.client.delete_collection(rag.COLLECTION_NAME)
    rag.collection = rag.client.get_or_create_collection(rag.COLLECTION_NAME)
    yield


@pytest.fixture()
def test_db(tmp_path):
    """A fresh SQLite file per test, isolated from the real app.db."""
    db_path = tmp_path / "test.db"
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    yield TestSessionLocal
    engine.dispose()


@pytest.fixture()
def fake_gemini():
    return FakeGeminiClient()


@pytest.fixture()
def app(test_db, tmp_path, monkeypatch, fake_gemini):
    """The real FastAPI app, with the DB swapped for an isolated temp copy
    and Gemini replaced by a deterministic fake (no test hits the real API
    or burns quota by default — see tests/test_conversations.py for the one
    real-API smoke test, gated behind RUN_LIVE_GEMINI_TESTS).

    Note: Chroma's persistent client is a module-level singleton in rag.py,
    created on first import of `main` — its path is fixed for the whole test
    process (see CHROMA_PATH handling in rag.py / conftest's session-scoped
    env setup), not overridable per test.
    """

    import main as main_module

    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    # conversations.py looks up db.SessionLocal at call time (not via a
    # `from db import SessionLocal` binding), specifically so this works.
    monkeypatch.setattr(db_module, "SessionLocal", test_db)

    main_module.app.dependency_overrides[get_db] = override_get_db
    main_module.app.dependency_overrides[get_gemini_client] = lambda: fake_gemini
    yield main_module.app
    main_module.app.dependency_overrides.clear()


@pytest.fixture()
def client(app):
    return TestClient(app)


@pytest.fixture()
def register_and_login(client):
    """Registers a user, returns (headers, user_json)."""

    def _do(email="user@example.com", password="password123"):
        client.post("/auth/register", json={"email": email, "password": password})
        res = client.post("/auth/login", json={"email": email, "password": password})
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}, res.json()["user"]

    return _do
