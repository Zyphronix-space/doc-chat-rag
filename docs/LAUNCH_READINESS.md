# Launch readiness

Status of the landing, trust, privacy, security and accessibility pass,
and how to ship it safely.

## Deploy rule: frontend first, then backend, minutes apart

The local backend and frontend depend on each other's changes. The live
versions were checked read-only on 11 Oct 2026: the live API's OpenAPI
schema, and the live JS bundle.

| Pairing | Result |
|---|---|
| Old frontend + **new** backend | **Broken.** The old signup form doesn't send `accept_terms`, so every signup gets a 400. The old Settings page sends no body to `DELETE /auth/me`, so deletion gets a 422. |
| **New** frontend + old backend | **Works.** The old backend ignores the extra `accept_terms` field. Deletion still works, but without the password check (today's behaviour). Only "Download my data" fails (404) until the backend lands. |
| New + new | The target. |

So **deploy the frontend first** and the backend straight after. **Never
deploy `backend/` on its own**, and never leave the new backend running
behind the old frontend.

```
cd frontend && vercel deploy --prod
#   check: the site loads and the new response headers are present
cd ../backend && vercel deploy --prod
#   check right away: log in with an existing account (it reads the new columns)
```

`backend/vercel.json` pins the function to `sin1` (Singapore), next to the
TiDB cluster. The live API runs in `iad1` (Washington, per the
`x-vercel-id` header), so the Privacy Policy's "the API runs in Singapore"
only becomes true once this backend deploy lands.

**The new backend runs a schema change on startup.** `init_db()`, called
from the FastAPI lifespan hook, runs `ALTER TABLE users ADD COLUMN
terms_version …, terms_accepted_at …` if those columns are missing. The
`User` model reads both columns, so if that hook ever failed to run,
**login and signup would return 500 for everyone**. That's why logging in
is the first check after the backend deploy.

## Pre-deploy checklist

- [ ] `cd backend && pytest`: all pass (81 at last run)
- [ ] `cd frontend && npm run build && npm run lint`: builds; lint shows no errors (warnings were already there)
- [ ] `cd frontend && npm run test:e2e`: all pass (65 tests across desktop and mobile: routing, consent, signup, forgot password, settings, axe WCAG 2.2 AA on every public route in light and dark, and the production CSP)
- [ ] Backend env on Vercel (`docmind-api`), checked with `vercel env ls production` (names only):
      - Must be set: `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `JWT_SECRET`, `CORS_ORIGINS`, `FRONTEND_URL`, `MAX_FILE_SIZE_MB` (value 4).
      - Must be **unset**: `PASSWORD_RESET_DEMO_MODE`.
      - Optional: `TERMS_VERSION` (defaults to 2026-10-11), `SMTP_*` (unset = no reset email), `JWT_EXPIRE_MINUTES` (defaults to 120, which the policies quote as 2 hours).
- [ ] Frontend env on Vercel (`docmind`): `VITE_API_URL=https://docmind-api-kappa.vercel.app`
- [ ] `frontend/vercel.json` `connect-src` matches `VITE_API_URL` in `.env.production`
- [ ] The `index.html` canonical, OG and Twitter URLs match the production domain
- [ ] Owner items in `docs/OWNER_ACTIONS.md` reviewed (they don't block a portfolio launch, but they do block inviting real users)

## Post-deploy smoke test

Run it straight after each deploy.

**Health and headers:**
```
curl -s  https://docmind-api-kappa.vercel.app/health            # {"status":"ok"}
curl -sI https://docmind-api-kappa.vercel.app/health | grep -iE "x-vercel-id|nosniff|x-frame"
#   x-vercel-id should now end in ::sin1::…, and nosniff/DENY should be present
curl -sI https://docmind-kohl-pi.vercel.app | grep -iE "content-security|x-frame|strict-transport|permissions-policy"
curl -s  https://docmind-api-kappa.vercel.app/openapi.json | grep -c DeleteAccountRequest   # 1 = new backend is live
```
`/health` doesn't touch the database, so it can't confirm the schema
change. Step 1 below does.

**In the browser** (DevTools console open; there should be no CSP errors
on any page):
1. Log in with an existing account. This proves the new columns exist.
2. Upload a small PDF, ask a question, and get an answer with citations.
   This proves streaming works under `connect-src`.
3. Open the uploaded PDF (the "Open" action). It's shown from a `blob:`
   URL, which the automated tests can't cover because headless Chromium
   has no PDF viewer.
4. Log out. Open `/`, choose "Reject optional" on the cookie banner and
   reload: the banner stays gone.
5. Sign up a **throwaway** account. The 18+/Terms box is required.
6. Settings → "Download my data" downloads a JSON file.
7. Settings → Security → delete the throwaway account. A wrong password is
   rejected, the right one deletes it, and you land on `/`.
8. Forgot password says email is unavailable and links to /contact.
9. Paste the URL into a link-preview checker and confirm `og-image.png`
   shows.

## Rollback

The database change only adds two nullable columns, so the old backend
code runs against the altered table unchanged. Leave the columns in place;
there's no down-migration.

| Symptom | Action |
|---|---|
| Problem only after the **backend** deploy (login/signup 500, chat broken) | Roll back **only the backend**: `cd backend && vercel rollback`, or Dashboard → docmind-api → Deployments → previous → "Instant Rollback". The new frontend works with the old backend (see the table above). |
| Problem in the **frontend** (blank page, CSP errors) | Roll back the backend first, then the frontend. Never leave the new backend behind the old frontend. |

Notes:
- On the Hobby plan, Instant Rollback goes to the **previous** production
  deployment. That's enough for this one-step release.
- Note the current production deployment URLs before deploying
  (`vercel ls` in each folder), so you know what "previous" is.
- `vercel rollback` takes a deployment URL or id if you need a specific
  one.
- The previous deployments were built from uncommitted working trees, so
  rollback depends on Vercel's stored deployments, not on git history.

## What was done in this pass

**Backend:**
- Terms acceptance is recorded at signup.
- Account deletion requires the password.
- `GET /auth/me/export` added.
- Security headers added.
- Password reset no longer leaks links. It sends SMTP mail when SMTP is
  configured, and gives the same response for known and unknown emails.
- The function is pinned to the `sin1` region.

**Frontend:**
- New landing page.
- Policy pages: /privacy, /terms, /refunds, /cookies and /contact. The old
  URLs redirect.
- Consent banner and preferences panel. The theme is stored only with
  consent, and withdrawing consent deletes it.
- 18+/Terms checkbox at signup.
- Settings: password-confirmed deletion, data export and cookie settings.
- Forgot Password handles each delivery mode.
- The upload limit comes from config, and the upload box shows a
  free-tier notice.

**Accessibility:**
- Skip links on public and app layouts.
- Accessible dialogs.
- Labelled inputs (GlassInput now always links its label).
- Low-contrast `text-gray-400` text replaced app-wide.
- Keyboard-reachable dropzone and scrollable tables.
- Labelled icon buttons.

**Ops:**
- CSP and security headers.
- New favicon, OG image (`npm run og-image`) and social meta.
- Playwright + axe test suite.

## Known gaps

- `GET /auth/me/export` builds the whole export in one response, and
  Vercel caps function responses at 4.5 MB. An account with a lot of
  extracted text will fail to export. A paged or streamed export would
  remove that limit.
- Account deletion removes chunks in separate commits before deleting the
  user. If the final delete failed, the documents would remain without
  their chunks. Nothing would be exposed, but the account would be
  inconsistent. One transaction would be better.
- `PATCH /auth/change-password` returns 401 for a wrong current password,
  and the frontend treats any 401 as "session expired", so a typo logs the
  user out. This was already there before this pass; 403 would fix it.
- Backend tests use SQLite without foreign-key enforcement. TiDB enforces
  foreign keys, so the throwaway-account deletion in the smoke test is the
  first check against the real database.

- The bundle is 656 kB minified (205 kB gzip) in one chunk. Route-level
  `lazy()` splitting would help first load.
- The rate limiter is in-memory per function instance (disclosed in the
  README).
- The in-app pages (dashboard, chat and so on) aren't covered by the axe
  suite yet. It only covers public routes, which need no API data.
