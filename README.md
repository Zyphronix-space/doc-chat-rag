# Chat With Your Documents (RAG)

Upload a PDF/TXT/MD file and ask questions about it. Answers are generated
by Gemini (free tier), grounded only in chunks retrieved from the document
— a retrieval-augmented generation (RAG) pipeline, not a plain LLM wrapper.

- **`backend/`** — FastAPI service.
  - Splits uploaded text into overlapping chunks (`langchain-text-splitters`'
    `RecursiveCharacterTextSplitter`).
  - Embeds each chunk with `sentence-transformers` (`all-MiniLM-L6-v2`, the
    same local embedding model used in `resume-job-matcher`) and stores it
    in a persistent Chroma collection.
  - On each question, embeds the query, retrieves the top-k most similar
    chunks, and passes only those chunks to Gemini as context — the model
    is instructed to say "I don't know" rather than answer from outside
    the retrieved text.
  - Verified live: asked a question against a test doc, and when the
    question implied a detail the doc didn't contain, Gemini correctly
    reported what the doc actually said instead of inventing an answer.
  - Retrieval also drops chunks below a relevance threshold, so a casual
    message ("hi", "thanks") doesn't get force-fit into an unrelated
    document excerpt — the model just replies naturally instead.
  - `/chat` streams the answer via `StreamingResponse` (token-by-token,
    not wait-for-the-whole-thing), with a first metadata line carrying
    per-source citation snippets.
  - "Summarize X" / "explain X" / a message naming an uploaded file bypass
    similarity search and pull the whole document's chunks (capped at 80)
    instead — a top-k similarity search against a vague command like
    "summarize" returns near-random chunks, not the ones that would
    actually cover the document.
  - A "Think longer" toggle raises Gemini's thinking budget (256 → 8192)
    and output ceiling for questions that need more reasoning, mirroring
    ChatGPT's reasoning-effort control.
- **`frontend/`** — React (Vite) UI, laid out like NotebookLM/Perplexity:
  a persistent sources sidebar (upload, list, remove) + a chat panel where
  answers stream in live and carry numbered citation chips — click one to
  expand the exact passage it was grounded in, instead of a flat "Sources:"
  line. Includes suggested starter prompts, a stop-generating control, and
  markdown-rendered answers.

## Running it

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
npm run dev
```

## What this demonstrates
- A real RAG pipeline: chunking → embedding → vector retrieval → grounded
  generation, not just "call an LLM API."
- Separating retrieval (free, local, sentence-transformers + Chroma) from
  generation (Gemini API free tier) — a cost-conscious design a student
  project can actually afford to run.
- Persistent vector storage (Chroma survives backend restarts) served
  behind a REST API, with a full-stack UI to use it.

## Interview prep

**Why Chroma instead of pgvector/Pinecone?** Chroma is embedded — no
separate server or hosted service to run — while still being a real vector
database with persistence, so the project stays easy to run locally and
demo without extra infra. pgvector would be the more "production" answer
if the rest of the stack were already on Postgres.

**Why sentence-transformers for embeddings but Gemini for generation?**
Running embeddings locally is free and fast enough for chunk-sized text,
so only the generation step — which needs real reasoning over the
retrieved context — calls out to an API. Using Gemini's free tier for
that keeps the whole app runnable at zero cost, which matters for a
project meant to be demoed repeatedly in interviews.

**Why chunk with overlap?** A fixed-size split can cut a sentence (or the
answer to a question) exactly at a chunk boundary. A ~150-token overlap
between consecutive chunks means the relevant sentence is very likely to
appear whole in at least one chunk.

**What stops the model from hallucinating?** The system prompt restricts
it to the retrieved excerpts and tells it to say "I don't know" rather
than guess; the retrieved chunks and their source files are also returned
alongside the answer so a user can verify the citation themselves.

**Known limitation:** retrieval only looks at the current question, not
the running chat history, so a follow-up like "what about the third one?"
without restating context may retrieve the wrong chunks. A production
version would rewrite the query using chat history before retrieval.

**Why click-to-expand citations instead of a plain source list?** Modeled
on NotebookLM's and Perplexity's citation UX — surfacing the source name
alone doesn't let a user verify the claim without leaving the app; showing
the exact retrieved passage inline does, at the cost of one click instead
of zero.

**Why a custom streaming protocol instead of Server-Sent Events?** The
citation metadata (which chunks got retrieved) is known before generation
starts, so it's sent as a single JSON line before the token stream rather
than a separate request — one round trip, no extra library, and the
frontend only needs a plain `ReadableStream` reader, not an SSE parser.

**Why `gemini-3.5-flash-lite` instead of the full flash model?** Found the
hard way: the full `gemini-3.6-flash` free tier caps out at **20 requests
per day per project** — easy to exhaust in a single testing session, and
it's what made the app look randomly broken ("works, then stops working
for no reason"). The `-lite` tier carries a much higher free-tier daily
quota, at the cost of somewhat shallower reasoning — a reasonable trade
for a chat-over-your-own-notes app. Errors are also now caught and shown
as a readable "hit the rate limit, try again" message instead of a raw
JSON dump in the chat.

**Why does "summarize" sometimes take 30–45 seconds?** Feeding a whole
80-chunk document to the model is a lot more input than a normal
retrieval-based answer (4 chunks), so it's genuinely slower — not stuck.
The frontend timeout is set high enough (60s, 90s for Think Longer) to
not cut it off, and the typing indicator stays visible the whole time.
