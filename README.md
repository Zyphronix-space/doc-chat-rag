# DocIntel — AI Document Intelligence Platform

A multi-user platform for uploading documents, organizing them into
collections, and chatting against one document, several, or a whole
collection — with every answer exposing exactly which chunks (and, for
PDFs, which real page numbers) it was grounded in. Started as a small
single-file RAG demo (`chat-with-your-documents`); this is the upgraded,
full-stack version: JWT auth, a relational data model, per-user document
CRUD, collections, persisted conversations, page-accurate citations, a
dashboard, and a small honest RAG evaluation framework.

## Architecture

```
backend/               FastAPI service
  main.py              app wiring, CORS, lifespan (DB init)
  config.py            env var loading
  db.py                SQLAlchemy engine/session
  models.py             User, Document, Collection, Conversation, Message, Source, EvalCase
  schemas.py            Pydantic request/response models
  auth.py               password hashing (bcrypt) + JWT
  deps.py                current-user dependency, ownership-check helper, injectable Gemini client
  ingestion.py           file validation + per-page text extraction (page numbers survive here)
  rag.py                 Chroma ingestion/retrieval, scoped by user_id/document_id/collection_id
  chat_logic.py          Gemini prompting + streaming (shared by /conversations/{id}/messages)
  routers/               one router per resource: auth, documents, collections, conversations,
                          dashboard, evaluation
  tests/                 pytest suite (49 tests) — see "Testing" below

frontend/               React 19 + Vite + React Router + Tailwind CSS
  src/api/               fetch wrapper + one module per resource
  src/context/            AuthContext, ToastContext, ThemeContext
  src/hooks/useChatStream.js   streaming fetch + citation parsing, shared by the chat page
  src/components/         layout/, chat/, documents/, collections/, dashboard/, common/
  src/pages/              Login, Register, Dashboard, Documents, DocumentDetail, Collections,
                          CollectionDetail, Conversations, Chat, Evaluation, NotFound
```

**Data model.** Chroma remains the only vector store — nothing in the
relational DB stores embeddings. SQLite (via SQLAlchemy) holds ownership
and structure: `Document.collection_id` is a nullable one-to-one FK (a
document lives in at most one collection, matching the "folder" metaphor —
`University/{Database.pdf, DSA.pdf, Networks.pdf}`). `Conversation` records
its retrieval scope as either a `collection_id` or a many-to-many set of
documents (`conversation_documents`). `Source` is its own table: one row
per citation on a specific assistant `Message` (which document, which
chunk, which real page number if any, the retrieved snippet, the retrieval
distance, and its rank) — not a duplicate of `Document`, since it's
per-message citation *facts*, not document identity.

## RAG pipeline

```
Upload → validate (type/size/hash) → extract text PER PAGE → chunk per page
  → embed (sentence-transformers, local) → Chroma (tagged with user_id,
  document_id, page_number?, collection_id?) → [on question] embed query
  → Chroma similarity search, scoped by user + selected documents/collection
  → relevant chunks → Gemini (system prompt enforces "answer only from
  these excerpts, say you don't know otherwise") → streamed, grounded answer
  + citations (document, real page number if available, exact chunk text)
```

**Chunking.** `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)`,
same as the original project — but now run **per PDF page**, not on the whole
document joined into one string. This is what makes real page numbers
possible: `ingestion.py:extract_pages()` returns `[(page_number, text), ...]`
per page via pdfplumber, and each page's chunks carry that page number into
Chroma metadata. TXT/MD files have no concept of a page — their citations
simply omit `page_number` rather than fabricating one.

**Known limitation** (a real trade-off, not an oversight): chunking per page
means the 150-character overlap no longer bridges *across* a page boundary —
a sentence split exactly at the end of one page and the start of the next
won't be stitched back together the way an overlap within a page is. This
is the cost of real page numbers vs. the original single-string chunking,
which had seamless overlap but no page information at all.

**Retrieval scoping.** Every Chroma query always filters on `user_id` first
(defense-in-depth alongside the relational ownership checks — a chunk query
can never cross users even if an authorization check elsewhere had a bug).
A conversation scoped to specific documents filters on `document_id $in
[...]`; a conversation scoped to a collection resolves the collection's
*current* ready-document membership via SQL first, then queries Chroma with
that document-id list — so removing a document from a collection
immediately stops it being searched, without relying on Chroma's own
(potentially stale) `collection_id` metadata tag. That tag is still kept in
sync via `rag.update_document_collection()` on every move, for the rare
future case of a Chroma-side-only scoped query.

**Safety.** The same grounding system prompt from the original project
carries over unchanged: answer strictly from the retrieved excerpts, say
"I don't know" rather than guess if they don't cover the question, and
reply naturally (no forced citations) to casual messages. Verified live in
this session (see `chat_logic.py` and `routers/conversations.py`).

## Database schema

| Table | Key columns |
|---|---|
| `users` | email (unique), hashed_password, is_active |
| `documents` | user_id, collection_id?, display_name, content_hash (unique per user), status (pending/processing/ready/failed), status_error, page_count?, chunk_count |
| `collections` | user_id, name, description? |
| `conversations` | user_id, scope_type (document_set/collection), scope_collection_id? |
| `conversation_documents` | conversation_id, document_id (association table) |
| `messages` | conversation_id, role, content, think_longer? |
| `sources` | message_id, document_id, chunk_id, chunk_index, page_number?, snippet, distance?, rank |
| `eval_cases` | user_id, question, expected_answer?, expected_source_document_id?, expected_page? |

## API reference

All routes except `/health`, `/auth/register`, `/auth/login` require
`Authorization: Bearer <token>`. Every owned-resource route (documents,
collections, conversations, eval cases) is scoped to the current user;
accessing another user's resource returns **404**, not 403, so a request
can't even confirm the resource exists.

| Method & path | Purpose |
|---|---|
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Get a JWT |
| `POST /auth/logout` | No-op server-side (stateless JWT) — client discards the token |
| `GET /auth/me` | Current user |
| `POST /documents` | Upload (multipart `file`, optional `?collection_id=`) — dedup-aware |
| `GET /documents` | List (`?collection_id=&status_filter=`) |
| `GET /documents/{id}` | Detail |
| `GET /documents/{id}/file` | Download the original file |
| `PATCH /documents/{id}` | Rename / move (`display_name?`, `collection_id?`) |
| `DELETE /documents/{id}` | Deletes DB row + Chroma chunks + file on disk |
| `POST /collections` | Create |
| `GET /collections` | List (with document_count) |
| `GET /collections/{id}` | Detail + documents |
| `PATCH /collections/{id}` | Rename / edit description |
| `DELETE /collections/{id}` | Un-files its documents (doesn't delete them) |
| `POST /collections/{id}/documents?document_id=` | Add a document |
| `DELETE /collections/{id}/documents/{document_id}` | Remove a document |
| `POST /conversations` | Create (`scope_type`, `document_ids[]` or `collection_id`) |
| `GET /conversations` | List, most recent first |
| `GET /conversations/{id}` | Detail + full message history |
| `PATCH /conversations/{id}` | Rename / change scope |
| `DELETE /conversations/{id}` | Cascades messages + sources |
| `POST /conversations/{id}/messages` | Ask a question — **streams**: one JSON `{citations}` line, then raw answer tokens; persists both messages + sources after the stream completes |
| `GET /conversations/{id}/messages` | Full message history |
| `GET /dashboard/summary` | Counts |
| `GET /dashboard/recent` | Recent documents + conversations |
| `POST /eval/cases`, `GET /eval/cases`, `DELETE /eval/cases/{id}` | Manage test cases |
| `POST /eval/run` | Run cases: retrieval hit/miss + optional faithfulness score |

## Setup

**Backend:**
```
cd backend
pip install -r requirements.txt
cp .env.example .env   # add your GEMINI_API_KEY (free at aistudio.google.com/apikey)
uvicorn main:app --reload
```

**Frontend:**
```
cd frontend
npm install
cp .env.example .env   # only needed if the API isn't on localhost:8000
npm run dev
```

### Environment variables

| Variable | Default | Notes |
|---|---|---|
| `GEMINI_API_KEY` | — | required for chat/eval to work |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | the `-lite` tier has a much higher free-tier daily quota |
| `JWT_SECRET` | random, generated at startup | **set this in production** — without it, all tokens are invalidated on every restart (a clear startup warning is printed either way) |
| `JWT_EXPIRE_MINUTES` | `120` | |
| `DATABASE_URL` | `sqlite:///./app.db` | single-file, zero-config |
| `UPLOAD_DIR` | `uploads` | raw uploaded files, per-user subfolders |
| `CHROMA_PATH` | `chroma_db` | persistent vector store |
| `MAX_FILE_SIZE_MB` | `20` | |
| `CORS_ORIGINS` | `http://localhost:5173` | comma-separated |
| `VITE_API_URL` (frontend) | `http://localhost:8000` | |

## Evaluation

`GET/POST /eval/cases` + `POST /eval/run`, also reachable from the
**Evaluation** page in the UI. Two signals, both honest about their limits:

- **Retrieval hit rate** — a direct, unambiguous measurement: was the
  case's `expected_source_document_id` actually among the retrieved
  chunks' document ids? No LLM involved.
- **Faithfulness score** — a second Gemini call acts as a judge, comparing
  the generated answer to the case's `expected_answer` and returning a
  0–1 score. Every result labels this explicitly as
  `"gemini-self-judge, not a rigorous eval"` — it's a heuristic, not a
  benchmark, and a score is only ever shown when the judge's reply parses
  cleanly as a number (never fabricated when it doesn't).

Runs are computed on demand and returned in the response, not persisted as
run history — matches "a small, manually-defined test set," not a
production eval pipeline.

## Testing

```
cd backend
pytest
```

49 tests across `tests/test_auth.py`, `test_documents.py`,
`test_collections.py`, `test_conversations.py`, `test_dashboard.py`,
`test_evaluation.py`, `test_authorization.py`. Each test gets an isolated
temp SQLite file; Chroma is reset before every test (see
`tests/conftest.py` for why — its client is a process-wide singleton).
Gemini is replaced by a deterministic fake by default (`FakeGeminiClient`
in `conftest.py`) via `app.dependency_overrides` — no test hits the real
API or burns quota. Real PDFs for page-number tests are generated on the
fly with `reportlab` (`tests/pdf_helpers.py`).

Authorization is tested at two levels: each resource's own test file
checks ownership at the point of testing that resource, and
`test_authorization.py` is a consolidated sweep asserting the blanket rule
holds everywhere (every read/write/delete on every resource type, cross-user,
returns 404) plus a path-traversal filename test and a tampered-JWT test.

## Deployment

No live deployment exists for this project (verified: no Dockerfile/CI
config in the repo). To deploy it, the same pattern used for this
portfolio's other project (`city-snapshot-service`, on Azure) applies
directly: an App Service (or any container host) for the FastAPI backend
with `DATABASE_URL`, `CHROMA_PATH`, and `UPLOAD_DIR` pointed at a
persistent disk/volume (SQLite + Chroma + uploads are all just files — they
need to survive restarts, so don't put them on ephemeral/local-only
storage in a container platform that doesn't guarantee that), and a Static
Web App (or any static host) for the built frontend (`npm run build`,
`VITE_API_URL` pointed at the deployed backend). `GEMINI_API_KEY` and
`JWT_SECRET` are server-side environment variables only — never shipped to
the frontend build.

## Security

- JWT auth, bcrypt password hashing, every owned-resource route checks
  `resource.user_id == current_user.id` and returns 404 on mismatch.
- File uploads: extension allowlist (PDF/TXT/MD), size cap, content-hash
  dedup, filenames sanitized before touching disk (path-traversal and
  Windows-reserved-name safe — see `ingestion.py:safe_filename` and
  `tests/test_authorization.py::test_path_traversal_filename_is_sanitized_on_disk`).
- `GEMINI_API_KEY` is read server-side only (`config.py`), never exposed
  to the frontend.
- CORS origins are environment-configured, not hardcoded.
- `JWT_SECRET` has a dev-only random fallback (with a startup warning) so
  the project still runs zero-config locally — set it explicitly for any
  real deployment, since without it every restart invalidates all
  outstanding sessions.

## What this demonstrates (interview prep)

Beyond the original project's RAG fundamentals (chunking, local embeddings,
Chroma retrieval, grounded generation, streaming, citation UX — see the
original design notes preserved in `chat_logic.py` and `rag.py`'s
docstrings), this version demonstrates:

- Multi-tenant data modeling: a single Chroma collection made safely
  multi-user via consistent metadata scoping, not a separate vector store
  per user.
- Designing citations that don't lie: page numbers are only ever shown
  when they're real (pulled from pdfplumber's actual page boundaries),
  with an explicit trade-off documented (overlap doesn't cross pages)
  rather than silently degrading accuracy for a cosmetic feature.
- An evaluation framework that resists the temptation to fabricate rigor —
  retrieval hit-rate is measured directly; faithfulness is clearly labeled
  as an LLM-judge heuristic, never presented as a validated metric.
- Testability retrofitted onto code that wasn't originally written for
  it: the Gemini client became an injectable FastAPI dependency
  specifically so tests can swap in a deterministic fake.
