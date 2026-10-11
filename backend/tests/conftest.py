import os
import sys
import hashlib
import math
import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# The suite registers dozens of throwaway users back-to-back via
# register_and_login -- disable the auth rate limiter globally here so that
# behavior doesn't trip on normal test volume. test_password_reset.py
# re-enables it (via monkeypatch) for the one test that actually exercises it.
os.environ.setdefault("RATE_LIMIT_DISABLED", "true")
# The reset-flow tests read the link from the response (local demo mode);
# test_password_reset.py separately asserts it's never returned when off.
os.environ.setdefault("PASSWORD_RESET_DEMO_MODE", "true")

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


_STOPWORDS = {
    "a", "an", "the", "is", "are", "was", "were", "of", "to", "in", "on", "for", "and", "or",
    "it", "its", "this", "that", "what", "which", "who", "how", "does", "do", "did", "with", "by",
}


def _fake_embed(texts, task_type):
    """Deterministic offline stand-in for the Gemini embedding API: a hashed
    bag of crudely-stemmed content words, L2-normalized. Texts sharing words
    land close together, unrelated texts are orthogonal — enough for the
    retrieval/relevance tests without any network call."""
    dim = 256
    vectors = []
    for text in texts:
        vec = [0.0] * dim
        for word in re.findall(r"[a-z0-9]+", text.lower()):
            if word in _STOPWORDS:
                continue
            stem = re.sub(r"(ing|es|ed|s)$", "", word) if len(word) > 4 else word
            vec[int(hashlib.md5(stem.encode()).hexdigest(), 16) % dim] += 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        vectors.append([v / norm for v in vec])
    return vectors


@pytest.fixture(autouse=True)
def fake_embeddings(monkeypatch):
    """No test hits the real embedding API. The fake's distances are on a
    different scale from Gemini's, so the relevance cutoff is loosened to
    "shares at least one content word"."""
    import rag

    monkeypatch.setattr(rag, "embed_texts", _fake_embed)
    monkeypatch.setattr(rag, "MAX_RELEVANT_DISTANCE", 0.95)
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
    """

    import main as main_module

    def override_get_db():
        db = test_db()
        try:
            yield db
        finally:
            db.close()

    # conversations.py and rag.py look up db.SessionLocal at call time (not
    # via a `from db import SessionLocal` binding), specifically so this works.
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
        client.post("/auth/register", json={"accept_terms": True, "email": email, "password": password})
        res = client.post("/auth/login", json={"email": email, "password": password})
        token = res.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}, res.json()["user"]

    return _do
