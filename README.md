# GetHired — Hospitality Resume Hub

An ATS CV checker and CV builder for cruise ship and luxury hospitality
workers: waiters, bartenders, sommeliers, housekeeping, cabin stewards,
galley and F&B crew.

1. **Check** — upload a CV at `/tools/cruise-cv-checker` and get an ATS
   score, a category breakdown and concrete, industry-specific fixes
   ("Mention Micros POS", "Add your STCW certificate number").
2. **Build** — "Build My CV" hands the parsed CV into the builder at
   `/builder` (Plate & Pen), or you can import a CV there directly.
3. **Export** — pick a template and download a PDF that matches the preview.

## How it works

- **Scores are deterministic.** A rules engine computes the score, tier and
  category breakdown. The AI only explains and phrases feedback — it never
  changes a number.
- **Hospitality-aware matching.** A keyword/synonym map recognises the
  systems and certifications recruiters look for: Opera PMS, Micros,
  Simphony, Fidelio, Lightspeed, HACCP, STCW, WSET, Cape Wine Academy, and
  cruise-line terms (Cunard, MSC, Royal Caribbean, Norwegian, Celebrity).
- **Files stay in the browser.** PDF, DOCX and TXT files are parsed
  client-side (pdf.js, Mammoth, Tesseract OCR for scans). Only extracted
  text is sent to the server.
- **AI with failover.** Groq (`openai/gpt-oss-120b`) is the primary
  provider, Gemini 3.8 Flash the fallback. Every response is
  schema-validated. If both providers fail, the checker still shows the
  score and rule-based feedback, and the builder import falls back to a
  local parser.

## Tech stack

| Area      | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| App       | React, TanStack Start/Router, Vite, TypeScript, Tailwind      |
| Hosting   | Cloudflare Workers (KV result cache, Workers AI binding)      |
| AI        | Groq → Gemini failover (`src/lib/ai/`), free tiers only       |
| Data      | Supabase (auth, saved resumes, leads)                         |
| CV import | pdf.js, Mammoth, Tesseract.js                                 |
| PDF out   | Browser Save as PDF of the live preview (print CSS)           |
| Tests     | Vitest (unit + golden-file scores), Playwright (e2e)          |

## Getting started

Requires a current LTS release of Node.js.

```bash
npm install
cp .env.example .env   # then fill in your own keys
npm run dev
```

The app runs at the URL Vite prints (usually http://localhost:5173).

### Environment variables

See [`.env.example`](.env.example) for the full list.

| Variable                                      | Required | Purpose                                   |
| --------------------------------------------- | -------- | ----------------------------------------- |
| `GROQ_API_KEY`                                | Yes      | Primary AI provider                       |
| `GEMINI_API_KEY`                              | No       | Fallback AI provider                      |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase client                           |
| `SUPABASE_SERVICE_ROLE_KEY`                   | Yes      | Server-side Supabase access               |
| `VITE_CLARITY_PROJECT_ID`                     | No       | Microsoft Clarity analytics               |
| `LEAD_NOTIFY_*`, `RESEND_API_KEY`             | No       | Lead notification webhook / email         |

Never commit `.env`. In production, set secrets on the Worker:

```bash
npx wrangler secret put GROQ_API_KEY
```

### Feature flags

Flags are environment variables, off unless set to `"true"`, and can be
changed without a code change.

| Flag                 | Effect                                                    |
| -------------------- | --------------------------------------------------------- |
| `PRECHECK_ENABLED`   | Reject non-CV documents before scoring (on in production) |
| `HYBRID_EXTRACTION`  | Skip the AI call for imports when local parsing is strong |
| `WORKERS_AI_ENABLED` | Add Cloudflare Workers AI as a third provider             |
| `MERGED_CALL`        | Get analysis and parsed CV from one AI call               |
| `IMPORT_AI_ENRICH`   | AI-enrich CVs handed from the checker to the builder      |

## Scripts

| Command                  | What it does                                  |
| ------------------------ | --------------------------------------------- |
| `npm run dev`            | Start the dev server                          |
| `npm run build`          | Production build (client + server)            |
| `npm test`               | Unit and golden-file tests (Vitest)           |
| `npm run test:e2e`       | End-to-end tests (Playwright)                 |
| `npm run lint`           | ESLint                                        |
| `npm run format`         | Prettier                                      |
| `npm run deploy`         | Build and deploy to Cloudflare                |
| `npm run deploy:staging` | Build and deploy to staging                   |

## Project structure

```
src/
  routes/                 Pages: landing, checker, builder, dashboard, auth
  components/templates/   CV templates and the template registry
  lib/ai/                 Provider interface, Groq/Gemini adapters, failover router
  lib/cruiseCvRubric.ts   Scoring rubric and SCORING_VERSION
  lib/localEngine.ts      Deterministic scoring engine
  lib/cvExtractDeterministic.ts  Local CV parser
public/fonts/             Self-hosted template fonts
supabase/migrations/      Database schema and row-level security
tests/                    Unit tests, golden-file fixtures, e2e
```

## CV templates

| Template              | Best for                    |
| --------------------- | --------------------------- |
| Vintage (default)     | All hospitality roles       |
| Winelands             | Sommelier and wine roles    |
| Noir                  | Luxury cruise lines         |
| Executive             | Ship's management           |
| Harbour               | Hotel and resort            |
| Admiral               | Senior officers             |
| Steward               | Cabin and service crew      |

## Contributing

- `npm run build` and `npm test` must pass before every commit.
- **Golden-file tests lock exact scores.** Any change to scoring logic,
  weights or the keyword map must bump `SCORING_VERSION` (it salts the KV
  result cache) and regenerate the golden expectations in the same commit.
- Changes to shared template components must leave existing templates
  rendering identically.
- Test fixtures in `tests/fixtures/cvs/` are synthetic. Never commit real
  CVs, names, emails or phone numbers.
- Logs may include provider name, latency and outcome — never CV text.

See [`CLAUDE.md`](CLAUDE.md) for the full engineering rules and
[`gethired-build-scope.yaml`](gethired-build-scope.yaml) for the roadmap.
