"""SQLAlchemy ORM models.

Everything lives in one relational database: ownership, CRUD metadata, chat
history, per-citation facts, the original uploaded bytes, and the chunk
embeddings themselves (`Chunk.embedding` — a native VECTOR column on TiDB,
JSON text on SQLite; see rag.py for how each is searched).
"""

import enum
import json
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    LargeBinary,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    UniqueConstraint,
    Column,
)
from sqlalchemy.dialects.mysql import LONGBLOB, MEDIUMTEXT
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship
from sqlalchemy.types import TypeDecorator, UserDefinedType

import config
from db import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class UTCDateTime(TypeDecorator):
    """MySQL/TiDB DATETIME (like SQLite) drops tzinfo on a round trip — store
    UTC and re-attach it on load, so comparisons against
    datetime.now(timezone.utc) never mix naive and aware values."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):
        if value is not None and value.tzinfo is not None:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value

    def process_result_value(self, value, dialect):
        if value is not None and value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value


class _TiDBVector(UserDefinedType):
    cache_ok = True

    def __init__(self, dim: int):
        self.dim = dim

    def get_col_spec(self, **kw):
        return f"VECTOR({self.dim})"


class Vector(TypeDecorator):
    """A float vector: native VECTOR(dim) on TiDB, JSON text elsewhere. TiDB
    accepts and returns vectors in the same '[1.0,2.0,...]' text form."""

    impl = Text
    cache_ok = True

    def __init__(self, dim: int):
        super().__init__()
        self.dim = dim

    def load_dialect_impl(self, dialect):
        if dialect.name == "mysql":
            return dialect.type_descriptor(_TiDBVector(self.dim))
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value, dialect):
        return None if value is None else json.dumps([float(v) for v in value], separators=(",", ":"))

    def process_result_value(self, value, dialect):
        if isinstance(value, (bytes, bytearray)):
            value = value.decode()
        return None if value is None else json.loads(value)


class DocumentStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    ready = "ready"
    failed = "failed"


class MessageRole(str, enum.Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ScopeType(str, enum.Enum):
    document_set = "document_set"
    collection = "collection"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    # Record of the explicit signup acceptance of the Terms (which include the
    # 18+ eligibility requirement): which version, and when. Nothing more.
    terms_version: Mapped[str | None] = mapped_column(String(20), nullable=True)
    terms_accepted_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    documents: Mapped[list["Document"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    collections: Mapped[list["Collection"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    conversations: Mapped[list["Conversation"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    eval_cases: Mapped[list["EvalCase"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")


class Collection(Base):
    __tablename__ = "collections"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship(back_populates="collections")
    documents: Mapped[list["Document"]] = relationship(back_populates="collection")


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (UniqueConstraint("user_id", "content_hash", name="uq_user_content_hash"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    collection_id: Mapped[int | None] = mapped_column(
        ForeignKey("collections.id", ondelete="SET NULL"), index=True, nullable=True
    )

    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    original_filename: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), default="", nullable=False)  # legacy, unused
    # The original bytes, kept in the DB so a serverless deploy needs no disk.
    # Deferred: only loaded by the "open file" route, never by list queries.
    file_data: Mapped[bytes | None] = deferred(
        mapped_column(LargeBinary().with_variant(LONGBLOB(), "mysql"), nullable=True)
    )
    content_hash: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    file_type: Mapped[str] = mapped_column(String(10), nullable=False)
    file_size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus), default=DocumentStatus.pending, nullable=False
    )
    status_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    uploaded_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    processed_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)

    owner: Mapped["User"] = relationship(back_populates="documents")
    collection: Mapped["Collection | None"] = relationship(back_populates="documents")
    sources: Mapped[list["Source"]] = relationship(back_populates="document", cascade="all, delete-orphan")


conversation_documents = Table(
    "conversation_documents",
    Base.metadata,
    Column("conversation_id", ForeignKey("conversations.id", ondelete="CASCADE"), primary_key=True),
    Column("document_id", ForeignKey("documents.id", ondelete="CASCADE"), primary_key=True),
)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), default="New conversation", nullable=False)

    scope_type: Mapped[ScopeType] = mapped_column(Enum(ScopeType), nullable=False)
    scope_collection_id: Mapped[int | None] = mapped_column(
        ForeignKey("collections.id", ondelete="SET NULL"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow, onupdate=utcnow)

    owner: Mapped["User"] = relationship(back_populates="conversations")
    scope_collection: Mapped["Collection | None"] = relationship()
    scope_documents: Mapped[list["Document"]] = relationship(secondary=conversation_documents)
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at"
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    role: Mapped[MessageRole] = mapped_column(Enum(MessageRole), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    think_longer: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sources: Mapped[list["Source"]] = relationship(back_populates="message", cascade="all, delete-orphan")


class Source(Base):
    """Per-citation record: which chunk a specific assistant Message drew from."""

    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("messages.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )

    chunk_id: Mapped[str] = mapped_column(String(64), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    snippet: Mapped[str] = mapped_column(Text, nullable=False)
    distance: Mapped[float | None] = mapped_column(Float, nullable=True)
    rank: Mapped[int] = mapped_column(Integer, nullable=False)

    message: Mapped["Message"] = relationship(back_populates="sources")
    document: Mapped["Document"] = relationship(back_populates="sources")


class PasswordResetToken(Base):
    """The raw token is only ever handed to the caller once (in the demo-mode
    UI banner, since no mail provider is configured — see README) — only its
    SHA-256 hash is stored, matching the same discipline as password hashing."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime(), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(UTCDateTime(), nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    user: Mapped["User"] = relationship(back_populates="reset_tokens")


class EvalCase(Base):
    __tablename__ = "eval_cases"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    expected_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_source_document_id: Mapped[int | None] = mapped_column(
        ForeignKey("documents.id", ondelete="SET NULL"), nullable=True
    )
    expected_page: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime(), default=utcnow)

    owner: Mapped["User"] = relationship(back_populates="eval_cases")
    expected_source_document: Mapped["Document | None"] = relationship()


class Chunk(Base):
    """One embedded chunk of a document — the vector store. Retrieval is
    always filtered by user_id first (see rag.py)."""

    __tablename__ = "chunks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    document_id: Mapped[int] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True, nullable=False
    )
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    page_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    text: Mapped[str] = mapped_column(Text().with_variant(MEDIUMTEXT(), "mysql"), nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(config.EMBEDDING_DIM), nullable=False)
