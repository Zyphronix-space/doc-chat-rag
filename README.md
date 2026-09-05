# DocMind — AI Document Intelligence Workspace

A multi-user AI knowledge workspace: upload documents, organize them into
collections, and chat against one document, several, or a whole collection —
with every answer exposing exactly which chunks (and, for PDFs, which real
page numbers) it was grounded in, and an explicit refusal when nothing in
your documents supports the question. Started as a small single-file RAG
demo (`chat-with-your-documents`); this is the full-stack, production-shaped
version: JWT auth (including password reset), a relational data model,
per-user document CRUD, collections, persisted conversations, page-accurate
citations, a command palette, real usage analytics, and a small honest RAG
evaluation framework — all on top of the same TF-IDF-free, sentence-embedding
+ Chroma retrieval pipeline the project started with.

## Product flow

```
Upload → Organize → Search → Chat → Cite → Save
```

Public pages (Landing, Features, Login, Signup, Forgot/Reset Password) sit
in front of the authenticated workspace (Dashboard, Documents, Collections,
Chat, Conversations, Sources, Analytics, Settings) — a "Liquid Glass"
design system (blue/cyan/white/soft-neutral glass, restrained — no neon)
used consistently across both.

## Architecture

```
backend/               FastAPI service
  main.py              app wiring, CORS, lifespan (DB init)
  config.py            env var loading
  db.py                SQLAlchemy engine/session
  models.py             User, Document, Collection, Conversation, Message, Source,
                         PasswordResetToken, EvalCase
  schemas.py             Pydantic request/response models
  auth.py               password hashing (bcrypt) + JWT + reset-token hashing
  ratelimit.py           hand-rolled in-memory per-IP rate limiter
  deps.py                current-user dependency, ownership-check helper, injectable Gemini client
  ingestion.py           file validation + per-page text extraction (page numbers survive here)
  rag.py                 Chroma ingestion/retrieval, scoped by user_id/document_id/collection_id
  chat_logic.py          Gemini prompting + streaming (shared by /conversations/{id}/messages);
                         distinguishes "no documents in scope" (casual chat) from "documents in
                         scope but nothing relevant retrieved" (must refuse, not free-answer)
  routers/               one router per resource: auth, documents, collections, conversations,
                          dashboard, sources, evaluation
  tests/                 pytest suite (73 tests) — see "Testing" below

frontend/               React 19 + Vite + React Router + Tailwind CSS v4
  src/api/               fetch wrapper + one module per resource
  src/context/            AuthContext, ToastContext, ThemeContext
  src/hooks/useChatStream.js   streaming fetch + citation parsing, shared by the chat page
  src/components/glass/   Glass* component library (Card, Button, Input, Modal, Toast wrapper,
                          Skeleton, EmptyState, DocumentCard, ChatBubble/SourceCard re-exports,
                          Navbar, Sidebar)
  src/components/         layout/, chat/, documents/, collections/, dashboard/, common/
  src/pages/              Landing, Features, Login, Signup, ForgotPassword, ResetPassword,
                          Dashboard, Documents, DocumentDetail, Collections, CollectionDetail,
                          NewChat, Chat, Conversations, Sources, Analytics (Usage + Evaluation
                          tabs), Settings, NotFound
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
per-message citation *facts*, not document identity. `PasswordResetToken`
follows the same "never store the secret itself" discipline as password
hashing — only a SHA-256 hash of the token is persisted.

## RAG pipeline

```
Upload → validate (type/size/hash) → extract text PER PAGE → chunk per page
  → embed (sentence-transformers, local) → Chroma (tagged with user_id,
  document_id, page_number?, collection_id?) → [on question] embed query
  → Chroma similarity search, scoped by user + selected documents/collection
  → relevant chunks → Gemini (system prompt enforces "answer only from
  these excerpts, say you couldn't find it otherwise") → streamed, grounded
  answer + citations (document, real page number if available, exact chunk
  text)
```

**Chunking.** `RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)`,
run **per PDF page**, not on the whole document joined into one string. This
is what makes real page numbers possible: `ingestion.py:extract_pages()`
returns `[(page_number, text), ...]` per page via pdfplumber, and each
page's chunks carry that page number into Chroma metadata. TXT/MD files
have no concept of a page — their citations simply omit `page_number`
rather than fabricating one.

**Retrieval scoping.** Every Chroma query always filters on `user_id` first
(defense-in-depth alongside the relational ownership checks — a chunk query
can never cross users even if an authorization check elsewhere had a bug).
A conversation scoped to specific documents filters on `document_id $in
[...]`; a conversation scoped to a collection resolves the collection's
*current* ready-document membership via SQL first, then queries Chroma with
that document-id list — so removing a document from a collection
immediately stops it being searched.

**Grounding, precisely.** The system prompt (`chat_logic.py`) distinguishes
three cases, not two: (1) no documents selected at all — casual chat,
general-knowledge answers are fine; (2) documents selected and relevant
excerpts retrieved — answer strictly from them; (3) **documents selected
but nothing relevant was retrieved for this specific question** — say
plainly that the information couldn't be found in the selected documents,
never fall back to free-knowledge. Case (3) previously produced the exact
same bare-question prompt as case (1), so the model couldn't tell a
genuine grounding failure apart from a greeting — `build_prompt()`'s
`has_scope` flag fixes that; verified live: "What is the boiling point of
liquid nitrogen in Kelvin?", asked in a conversation scoped to an unrelated
document, produces "I couldn't find that information in the selected
documents" rather than the (correct, but out-of-scope) real answer.

**Semantic document search.** `GET /documents/semantic-search?q=` reuses
`rag.retrieve_chunks()` with no document filter (only the user-id scope),
groups hits by document, and returns each document's best-ranked chunk as
a snippet — the same retrieval path chat uses, exposed as a standalone
"search your documents' content" feature rather than a new pipeline.

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
| `password_reset_tokens` | user_id, token_hash (unique), expires_at, used_at? |
| `eval_cases` | user_id, question, expected_answer?, expected_source_document_id?, expected_page? |

No migration framework is used or needed — `db.py:init_db()` calls
SQLAlchemy's `Base.metadata.create_all()`, which safely adds new tables
(like `password_reset_tokens`) without touching existing ones.

## API reference

All routes except `/health`, `/auth/register`, `/auth/login`, and
`/auth/forgot-password`/`/auth/reset-password` require
`Authorization: Bearer <token>`. Every owned-resource route (documents,
collections, conversations, sources, eval cases) is scoped to the current
user; accessing another user's resource returns **404**, not 403, so a
request can't even confirm the resource exists. `login`, `register`, and
`forgot-password` are additionally rate-limited per client IP.

| Method & path | Purpose |
|---|---|
| `POST /auth/register` | Create an account |
| `POST /auth/login` | Get a JWT |
| `POST /auth/logout` | No-op server-side (stateless JWT) — client discards the token |
| `GET /auth/me` | Current user |
| `POST /auth/forgot-password` | `{email}` → generates a reset token if the email exists; see Password reset below |
| `POST /auth/reset-password` | `{token, new_password}` → consumes the token, sets the new password |
| `PATCH /auth/change-password` | `{current_password, new_password}` |
| `DELETE /auth/me` | Delete own account (cascades documents/collections/conversations + their Chroma chunks) |
| `POST /documents` | Upload (multipart `file`, optional `?collection_id=`) — dedup-aware |
| `GET /documents` | List (`?collection_id=&status_filter=&q=` — `q` filters by filename) |
| `GET /documents/semantic-search` | `?q=&limit=` — searches document *content*, grouped by document |
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
| `POST /conversations/{id}/messages` | Ask a question — **streams**: one JSON `{citations}` line, then raw answer tokens |
| `GET /conversations/{id}/messages` | Full message history |
| `GET /sources` | `?document_id=&limit=&offset=` — every citation across all your conversations, most recent first |
| `GET /dashboard/summary` | Counts |
| `GET /dashboard/recent` | Recent documents + conversations |
| `GET /dashboard/analytics` | Real usage: documents by status, questions asked, 30-day daily activity |
| `POST /eval/cases`, `GET /eval/cases`, `DELETE /eval/cases/{id}` | Manage test cases |
| `POST /eval/run` | Run cases: retrieval hit/miss + optional faithfulness score |

## Password reset

There is **no email provider configured anywhere in this project** — no
SMTP, SendGrid, Resend, or similar. Rather than fake it, the reset flow is
real end to end (a hashed, single-use, 30-minute-expiring token, generated
with `secrets.token_urlsafe`), but the Forgot Password page honestly
displays the generated link directly, in a clearly labeled "DEMO MODE"
banner, instead of pretending an email was sent. This is a deliberate,
disclosed tradeoff for a demo deployment — the same "explained rather than
hidden" approach this project already takes with plaintext message
storage and the evaluation framework's honesty about what it measures. A
production deployment would wire `POST /auth/forgot-password` to a real
mail provider and stop returning `demo_reset_link` in the response.

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
| `FRONTEND_URL` | `http://localhost:5173` | used only to build the password-reset link (see above) |
| `RATE_LIMIT_DISABLED` | unset | set to `true` to disable the auth rate limiter (used by the test suite) |
| `VITE_API_URL` (frontend) | `http://localhost:8000` | |

## Evaluation & Analytics

The **Analytics** page has two tabs:

- **Usage** — real data from `GET /dashboard/analytics`: documents by
  processing status, total questions asked, and a 30-day daily activity
  chart. Computed straight from SQL, nothing simulated.
- **Evaluation** — `GET/POST /eval/cases` + `POST /eval/run`. Two signals,
  both honest about their limits:
  - **Retrieval hit rate** — a direct, unambiguous measurement: was the
    case's `expected_source_document_id` actually among the retrieved
    chunks' document ids? No LLM involved.
  - **Faithfulness score** — a second Gemini call acts as a judge, comparing
    the generated answer to the case's `expected_answer` and returning a
    0–1 score. Every result labels this explicitly as
    `"gemini-self-judge, not a rigorous eval"` — a heuristic, not a
    benchmark, and a score is only ever shown when the judge's reply parses
    cleanly as a number.

Runs are computed on demand and returned in the response, not persisted as
run history — matches "a small, manually-defined test set," not a
production eval pipeline.

## Testing

```
cd backend
pytest
```

73 tests across `tests/test_auth.py`, `test_password_reset.py`,
`test_documents.py`, `test_search.py`, `test_collections.py`,
`test_conversations.py`, `test_dashboard.py`, `test_sources.py`,
`test_evaluation.py`, `test_authorization.py`. Each test gets an isolated
temp SQLite file; Chroma is reset before every test (see
`tests/conftest.py` for why — its client is a process-wide singleton).
Gemini is replaced by a deterministic fake by default (`FakeGeminiClient`
in `conftest.py`) via `app.dependency_overrides` — no test hits the real
API or burns quota. Real PDFs for page-number tests are generated on the
fly with `reportlab` (`tests/pdf_helpers.py`). The auth rate limiter is
disabled for the whole suite (many tests register users back-to-back)
except in `test_password_reset.py`, where one test re-enables it via
`monkeypatch` to prove it actually triggers.

Authorization is tested at two levels: each resource's own test file
checks ownership at the point of testing that resource, and
`test_authorization.py` is a consolidated sweep asserting the blanket rule
holds everywhere (every read/write/delete on every resource type — now
including sources, semantic search, change-password, and delete-account —
cross-user, returns 404 or 401) plus a path-traversal filename test and a
tampered-JWT test.

Frontend: `cd frontend && npm run build` (production build) and
`npm run lint` (oxlint). The full golden path (landing → signup → upload
→ chat with real grounded answers and citations → verify the grounding
refusal on an unsupported question → collections → conversations
rename/search → sources → analytics (both tabs) → settings
change-password/delete-account → forgot/reset password → command palette
→ mobile responsive check) was exercised end to end in a real browser
against a real `GEMINI_API_KEY`. Two real bugs were found and fixed this
way, not by inspection: (1) the grounding gap described above, and (2) the
Analytics usage chart's bars used percentage heights inside a flex column
with no sized ancestor (an `items-end` flex container doesn't stretch
children to fill it), so every bar silently collapsed to zero height —
fixed by giving each day's column an explicit `h-full`. The Chat page's
left panel (conversation switcher + scope) also had no responsive
collapse at all on mobile before this pass; it now collapses into a
toggleable drawer below the `md` breakpoint, matching the right-hand
sources panel's existing `lg:` collapse.

## Deployment

No live deployment exists for this project (verified: no Dockerfile/CI
config in the repo). To deploy it, the same pattern used for this
portfolio's other projects applies directly: an App Service (or any
container host) for the FastAPI backend with `DATABASE_URL`,
`CHROMA_PATH`, and `UPLOAD_DIR` pointed at a persistent disk/volume
(SQLite + Chroma + uploads are all just files — they need to survive
restarts), and a Static Web App (or any static host) for the built
frontend (`npm run build`, `VITE_API_URL` pointed at the deployed
backend). `GEMINI_API_KEY`, `JWT_SECRET`, and `FRONTEND_URL` are
server-side environment variables only — never shipped to the frontend
build.

## Security

- JWT auth, bcrypt password hashing, every owned-resource route checks
  `resource.user_id == current_user.id` and returns 404 on mismatch.
- `login`, `register`, and `forgot-password` are rate-limited per client IP
  (`backend/ratelimit.py`, a small hand-rolled in-memory fixed-window
  limiter — no Redis/slowapi dependency). It resets on process restart and
  isn't shared across workers or instances — a real, disclosed limitation.
- Password reset tokens are single-use, expire after 30 minutes, and only
  their SHA-256 hash is ever stored.
- File uploads: extension allowlist (PDF/TXT/MD) checked both client-side
  (fast-fail UX) and server-side (authoritative), size cap, content-hash
  dedup, filenames sanitized before touching disk (path-traversal and
  Windows-reserved-name safe).
- `GEMINI_API_KEY` is read server-side only (`config.py`), never exposed
  to the frontend.
- CORS origins are environment-configured, not hardcoded.
- `.env` files (both `backend/.env` and `frontend/.env`) are gitignored;
  `.env.example`/`.env.production` stay tracked since they hold no real
  secrets.

## What this demonstrates (interview prep)

Beyond the original project's RAG fundamentals (chunking, local embeddings,
Chroma retrieval, grounded generation, streaming, citation UX), this
version demonstrates:

- Multi-tenant data modeling: a single Chroma collection made safely
  multi-user via consistent metadata scoping, not a separate vector store
  per user.
- Designing citations that don't lie: page numbers are only ever shown
  when they're real (pulled from pdfplumber's actual page boundaries).
- A grounding system that distinguishes "nothing to ground on" from "tried
  to ground and failed" — the difference between a friendly chatbot
  fallback and a real, testable retrieval-failure signal — found and fixed
  by actually driving the chat UI with adversarial questions, not just
  reading the prompt.
- An evaluation framework that resists the temptation to fabricate rigor —
  retrieval hit-rate is measured directly; faithfulness is clearly labeled
  as an LLM-judge heuristic, never presented as a validated metric — sitting
  alongside a separate, real usage-analytics view so "how good is the
  model" and "what has this account actually been doing" are never
  conflated.
- A real password-reset flow with an honestly-disclosed demo-mode
  delivery tradeoff, hand-rolled rate limiting, and a delete-account path
  that remembers to clean up the vector store, not just the SQL rows.
- Testability retrofitted onto code that wasn't originally written for
  it: the Gemini client became an injectable FastAPI dependency
  specifically so tests can swap in a deterministic fake.
- A from-the-browser verification pass (not just `npm run build`) that
  caught two real bugs — a CSS layout bug (percentage heights need a
  sized ancestor) and a missing responsive breakpoint — that unit tests
  and a code read-through would not have caught.
