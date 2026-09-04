"""Pydantic request/response models, grouped by resource."""

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from models import DocumentStatus, MessageRole, ScopeType

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=200)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------------------------------------------------------------------
# Collections
# ---------------------------------------------------------------------------


class CollectionCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    description: str | None = None


class CollectionUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str | None
    document_count: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionDetailOut(CollectionOut):
    documents: list["DocumentOut"] = []


# ---------------------------------------------------------------------------
# Documents
# ---------------------------------------------------------------------------


class DocumentOut(BaseModel):
    id: int
    display_name: str
    original_filename: str
    file_type: str
    file_size_bytes: int
    status: DocumentStatus
    status_error: str | None
    page_count: int | None
    chunk_count: int
    collection_id: int | None
    uploaded_at: datetime
    processed_at: datetime | None
    duplicate: bool = False

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=255)
    collection_id: int | None = Field(default=None, description="Pass explicitly (incl. null) to move/unfile")


# ---------------------------------------------------------------------------
# Conversations / messages / citations
# ---------------------------------------------------------------------------


class ConversationCreate(BaseModel):
    title: str | None = None
    scope_type: ScopeType
    document_ids: list[int] | None = None
    collection_id: int | None = None


class ConversationUpdate(BaseModel):
    title: str | None = None
    scope_type: ScopeType | None = None
    document_ids: list[int] | None = None
    collection_id: int | None = None


class SourceOut(BaseModel):
    id: int
    document_id: int
    document_name: str = ""  # filled in after model_validate, from the Source.document relationship
    chunk_id: str
    chunk_index: int
    page_number: int | None
    snippet: str
    distance: float | None
    rank: int

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    id: int
    role: MessageRole
    content: str
    think_longer: bool | None
    created_at: datetime
    sources: list[SourceOut] = []

    model_config = {"from_attributes": True}


class ConversationOut(BaseModel):
    id: int
    title: str
    scope_type: ScopeType
    scope_collection_id: int | None
    scope_document_ids: list[int] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationDetailOut(ConversationOut):
    messages: list[MessageOut] = []


class ChatMessageRequest(BaseModel):
    question: str
    think_longer: bool = False


# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class DashboardSummary(BaseModel):
    total_documents: int
    total_collections: int
    total_conversations: int
    documents_ready: int
    documents_failed: int


class DashboardRecent(BaseModel):
    recent_documents: list[DocumentOut]
    recent_conversations: list[ConversationOut]


# ---------------------------------------------------------------------------
# Evaluation
# ---------------------------------------------------------------------------


class EvalCaseCreate(BaseModel):
    question: str = Field(min_length=1)
    expected_answer: str | None = None
    expected_source_document_id: int | None = None
    expected_page: int | None = None


class EvalCaseOut(BaseModel):
    id: int
    question: str
    expected_answer: str | None
    expected_source_document_id: int | None
    expected_page: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


class EvalRunRequest(BaseModel):
    case_ids: list[int] | None = None


class EvalCaseResult(BaseModel):
    case_id: int
    question: str
    retrieved_document_ids: list[int]
    retrieval_hit: bool | None
    faithfulness_score: float | None = None
    faithfulness_method: str | None = None
    answer: str | None = None


class EvalRunResult(BaseModel):
    results: list[EvalCaseResult]
    retrieval_hit_rate: float | None
