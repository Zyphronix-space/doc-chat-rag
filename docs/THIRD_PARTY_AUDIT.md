# Third-party audit

What leaves DocMind, who receives it, and what runs in the visitor's browser.
This is the source for the "Who receives your data" table in the Privacy
Policy (`frontend/src/config/site.js` → `PROCESSORS`). Keep the two in sync.

Last reviewed: 11 October 2026, against the code in this repository.

## Services that receive personal data

| Service | What it does for DocMind | Data it receives | Where | Retention |
|---|---|---|---|---|
| **Vercel Inc.** | Hosts the frontend; runs the FastAPI backend as a serverless function | Every request: IP address, user agent, path. Uploads and questions pass through on their way to the DB and Gemini | Frontend: global edge. API: Singapore (`sin1`, set in `backend/vercel.json`) | Runtime logs: 1 hour on the Hobby plan |
| **PingCAP — TiDB Cloud Starter** | The only database: users, documents (original bytes in `documents.file_data`), chunks + embeddings, conversations, messages, citations, eval cases, reset tokens | Everything DocMind stores | AWS `ap-southeast-1` (Singapore) | Until the user deletes it; automatic backups kept 1 day |
| **Google LLC — Gemini API (free tier)** | Embeddings for document chunks and questions; answer generation | Document text (for embeddings), questions, and the excerpts sent with each question | Google infrastructure, may include the US | **Free tier:** Google may use inputs/outputs to improve its products, and human reviewers may read them. See [Gemini API terms](https://ai.google.dev/gemini-api/terms) |
| **SMTP provider** *(not configured)* | Would send password-reset emails (`backend/mailer.py`) | Recipient email address and the reset link | Depends on provider | Depends on provider |

Not used, and verified absent from the code: analytics, advertising, session
recording, error-tracking SDKs, CDNs for scripts/fonts (fonts are
self-hosted via `@fontsource`), social embeds, payment processors.

### Consequences of the Gemini free tier

These are stated in the Privacy Policy, Terms and FAQ, and in a notice next
to the upload box:

1. **18+ only.** The Gemini API terms require users to be 18 or older and
   forbid apps directed at, or likely to be used by, under-18s. Signup
   requires an "I'm 18 or older" confirmation.
2. **No EEA / UK / Switzerland users.** Google's terms require the paid tier
   for apps made available to users there.
3. **Training and human review.** Users are told not to upload confidential
   or sensitive personal information.

Moving to a paid Gemini tier removes points 2 and 3. Point 1 needs a
different AI provider plus a parental-consent flow (see
`docs/OWNER_ACTIONS.md`).

## What the browser stores

DocMind sets **no cookies**. It uses `localStorage` only:

| Key | Category | Purpose | Set when |
|---|---|---|---|
| `doc_chat_rag_token` | Strictly necessary | Sign-in session (JWT, expires 2 h after sign-in) | Log in |
| `docmind_consent` | Strictly necessary | The visitor's storage choice | They choose in the banner or panel |
| `doc_chat_rag_theme` | Preferences (optional) | Light/dark choice | Only with consent. Deleted when consent is withdrawn |

The consent logic lives in `frontend/src/lib/consent.js` and is covered by
`frontend/e2e/flows.spec.js` (accept, reject, persist, withdraw).

## Network surface in the browser

The production Content-Security-Policy (`frontend/vercel.json`) allows
network connections only to the app's own origin and
`https://docmind-api-kappa.vercel.app`. It allows no third-party scripts,
styles or fonts. `frontend/e2e/csp.spec.js` replays that policy against
the production build and fails on any violation.

## Changing this

Adding a service that receives personal data means updating, in the same
change:
- this file;
- `PROCESSORS` in `frontend/src/config/site.js`;
- the CSP `connect-src` (if the browser talks to it);
- the Privacy Policy "last updated" date.

A material change also needs a `TERMS_VERSION` bump.
