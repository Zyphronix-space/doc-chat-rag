"""Shared Gemini prompting/streaming logic, factored out of the original
single-file /chat endpoint so it can be reused by the conversation-scoped
/conversations/{id}/messages endpoint without re-deriving any of it.

Preserves, unchanged in behavior:
- retrieval-mode selection (mentioned-source lookup / whole-doc summarize
  intent / top-k similarity)
- citation dedup-by-source with a 240-char snippet
- the custom streaming wire protocol: one JSON metadata line (citations),
  then raw token text
- the "think longer" thinking-budget toggle
- the grounding system prompt ("say I don't know" rather than invent)
"""

import json
import re

from google.genai import types as genai_types
from google.genai.errors import APIError

SYSTEM_PROMPT = (
    "You're the assistant inside a document-chat app. When document excerpts "
    "are provided below, answer strictly from those excerpts and say you "
    "don't know rather than guessing if they don't cover it. If the user has "
    "documents selected for this conversation but no excerpt was relevant "
    "enough to retrieve for this specific question, say plainly that you "
    "couldn't find that information in the selected documents — never answer "
    "such a question from your own general knowledge instead. If no documents "
    "are selected at all, the user is just chatting (a greeting, thanks, small "
    "talk, or a general-knowledge question with nothing to ground it in) — "
    "reply naturally and briefly, and it's fine to answer from general "
    "knowledge in that case. Match the user's tone: informal or casual "
    "messages (including slang/Gen-Z phrasing) get a relaxed, informal reply "
    "back, not a stiff formal one. Keep answers concise."
)

# "summarize/explain/what's this about" style commands need the whole document,
# not the handful of chunks a similarity search would return for a vague query.
WHOLE_DOC_INTENT_RE = re.compile(r"\b(summar\w*|overview|tl;?dr|explain)\b", re.IGNORECASE)

FAST_THINKING_BUDGET = 256
DEEP_THINKING_BUDGET = 8192


def find_mentioned_source(question: str, sources: list[str]) -> str | None:
    q = question.lower()
    for source in sources:
        stem = source.rsplit(".", 1)[0].lower()
        if source.lower() in q or (len(stem) > 3 and stem in q):
            return source
    return None


def build_citations(chunks: list[dict]) -> list[dict]:
    """Dedupe by source document, keeping the first (best-ranked) chunk's
    snippet per document — now carries the full retrieval record (page,
    chunk id/index, distance) instead of just a source name + snippet."""
    citations = []
    seen_documents = set()
    for rank, c in enumerate(chunks):
        if c["document_id"] in seen_documents:
            continue
        seen_documents.add(c["document_id"])
        snippet = c["text"][:240] + ("…" if len(c["text"]) > 240 else "")
        citations.append(
            {
                "document_id": c["document_id"],
                "source": c["source"],
                "chunk_id": c["chunk_id"],
                "chunk_index": c["chunk_index"],
                "page_number": c.get("page_number"),
                "snippet": snippet,
                "distance": c.get("distance"),
                "rank": rank,
            }
        )
    return citations


def build_prompt(question: str, chunks: list[dict], has_scope: bool = False) -> str:
    """`has_scope` distinguishes "no documents selected at all" (bare
    question, casual-chat territory) from "documents are selected but
    nothing relevant was retrieved for this question" (must still trigger
    the system prompt's "say you couldn't find it" behavior, not a
    free-knowledge answer) — without this, both cases produced an identical
    bare-question prompt and the model couldn't tell them apart."""
    if not chunks:
        if has_scope:
            return (
                "The user has documents selected for this conversation, but no excerpt "
                "was relevant enough to retrieve for this question. Tell them you "
                "couldn't find that information in the selected documents.\n\n"
                f"Question: {question}"
            )
        return question
    context = "\n\n".join(f"[{c['source']}]\n{c['text']}" for c in chunks)
    return f"Document excerpts:\n\n{context}\n\nQuestion: {question}"


def stream_answer(gemini_client, model: str, prompt: str, citations: list[dict], think_longer: bool):
    """Yields the wire protocol: one JSON citations line, then raw answer
    tokens. Also returns (via a mutable accumulator the caller inspects
    after the generator is exhausted) the full answer text so it can be
    persisted as a Message."""
    thinking_budget = DEEP_THINKING_BUDGET if think_longer else FAST_THINKING_BUDGET
    max_tokens = 4096 if think_longer else 1024
    system_instruction = SYSTEM_PROMPT
    if think_longer:
        system_instruction += (
            " The user asked you to think longer about this one — reason through it "
            "carefully and give a more thorough, detailed answer than usual."
        )

    yield json.dumps({"citations": citations}) + "\n"
    try:
        stream = gemini_client.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=system_instruction,
                max_output_tokens=max_tokens,
                thinking_config=genai_types.ThinkingConfig(thinking_budget=thinking_budget),
            ),
        )
        for event in stream:
            if event.text:
                yield event.text
    except APIError as exc:
        if exc.code == 429:
            yield "\n\n_Hit the free-tier rate limit. Wait a few seconds and try again._"
        else:
            yield f"\n\n_Gemini API error: {exc}_"


def generate_full_answer(gemini_client, model: str, prompt: str) -> str:
    """Non-streaming variant used by the evaluation runner — it needs the
    complete answer to score, not a token-by-token response."""
    try:
        stream = gemini_client.models.generate_content_stream(
            model=model,
            contents=prompt,
            config=genai_types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                max_output_tokens=1024,
                thinking_config=genai_types.ThinkingConfig(thinking_budget=FAST_THINKING_BUDGET),
            ),
        )
        return "".join(event.text for event in stream if event.text)
    except APIError as exc:
        return f"_Gemini API error: {exc}_"
