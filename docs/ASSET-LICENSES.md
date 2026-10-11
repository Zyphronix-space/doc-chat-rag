# Asset and dependency licenses

Everything shipped to users or used to build DocMind, with its license and
any obligation it creates. Versions are those in the lockfile and virtualenv
as of 11 October 2026.

## Code adapted into this repository

| Asset | Where | License | Obligations / notes |
|---|---|---|---|
| React Bits — "SplitText" | `frontend/src/components/marketing/SplitText.jsx` | MIT + Commons Clause v1.0 (© David Haz) | Keep the copyright header. Commons Clause forbids **selling the component itself** (e.g. reselling it in a UI kit). Using it inside an app, even a commercial one, is allowed. |
| React Bits — "SpotlightCard" | `frontend/src/components/marketing/SpotlightCard.jsx` | MIT + Commons Clause v1.0 (© David Haz) | As above. |
| DocMind brand mark | `BrandMark.jsx`, `public/favicon.svg`, `public/og-image.png` (source `frontend/scripts/og-image.html`) | Original work for this project | — |
| Product demo on the landing page | `frontend/src/components/marketing/ProductDemo.jsx` | Original work; uses synthetic sample content, not real user data | — |

## Fonts

| Font | Package | License | Notes |
|---|---|---|---|
| Instrument Serif | `@fontsource/instrument-serif` | SIL Open Font License 1.1 | Self-hosted (no Google Fonts request). It may be bundled and redistributed, but the font may not be sold on its own. |
| UI text | System font stack | — | No font files shipped. |

## Frontend runtime dependencies

| Package | License | Notes |
|---|---|---|
| `gsap`, `@gsap/react` | GSAP Standard "no-charge" License | Free for all uses, including commercial, since Webflow's acquisition (2024). The one restriction is not using it to build a tool that competes with Webflow's visual animation builders. Not OSI open source. |
| `lenis` | MIT | Smooth scrolling on public pages only, disabled under `prefers-reduced-motion`. |
| `react`, `react-dom` | MIT | |
| `react-router-dom` | MIT | |
| `react-markdown` | MIT | |
| `tailwindcss`, `@tailwindcss/vite` | MIT | |

## Frontend dev/test dependencies (not shipped)

| Package | License |
|---|---|
| `vite`, `@vitejs/plugin-react`, `oxlint` | MIT |
| `@playwright/test` | Apache-2.0 |
| `@axe-core/playwright`, `axe-core` | MPL-2.0 (used unmodified as a test tool, so there are no file-level copyleft obligations) |

## Backend dependencies (`backend/requirements.txt`)

| Package | Version | License |
|---|---|---|
| fastapi | 0.141.1 | MIT |
| uvicorn | 0.52.3 | BSD-3-Clause |
| python-multipart | 0.0.32 | Apache-2.0 |
| pdfplumber | 0.11.10 | MIT |
| langchain-text-splitters | 1.1.2 | MIT |
| google-genai | 2.20.0 | Apache-2.0 |
| python-dotenv | 1.2.2 | BSD-3-Clause |
| sqlalchemy | 2.0.52 | MIT |
| pymysql | 1.1.1 | MIT |
| certifi | 2026.7.22 | MPL-2.0 (unmodified) |
| bcrypt | 5.0.0 | Apache-2.0 |
| pyjwt | 2.13.0 | MIT |
| email-validator | 2.3.0 | Unlicense |

No GPL/AGPL dependencies. All of these licenses allow use in a deployed
web service without releasing DocMind's source.

## Checking for drift

```
cd frontend && npx license-checker --production --summary
cd backend && pip install pip-licenses && pip-licenses
```
