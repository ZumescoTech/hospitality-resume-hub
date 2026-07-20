# CLAUDE.md — GetHired (Hospitality Resume Hub)

Project instructions for Claude Code. Read fully before your first change
in any session. When these rules conflict with something you'd normally
do, these rules win.

## What this product is

GetHired is an ATS CV checker + CV builder for cruise ship and luxury
hospitality workers (waiters, bartenders, sommeliers, housekeeping, F&B).
The funnel: free ATS check at `/tools/cruise-cv-checker` → score + specific
fixes → "Build My CV" hands parsed data into the builder at `/builder`
("Plate & Pen") → user picks a template and prints to PDF.

The product's core promise is a *trustworthy score* and *industry-specific
advice*. Anything that makes scores inconsistent or advice generic breaks
the product, even if the code is elegant.

## Stack

- **Platform:** Cloudflare Workers (+ Pages assets, KV, secrets, R2 for media)
- **App:** React SPA, Vite build, TypeScript
- **AI:** Groq (llama-3.3-70b-versatile) primary; Gemini 2.5 Flash fallback
  (being introduced); provider layer in `src/lib/ai/`
- **Data:** Supabase (auth/persistence), Google Sheets webhook (lead capture)
- **CV parsing:** fully client-side — pdfjs, Mammoth (DOCX), FileReader
  (TXT), Tesseract OCR fallback. Files never leave the browser; only
  extracted text goes to the server.
- **PDF export:** `window.print()` — there is no PDF library. Print CSS
  fidelity is a feature, not a nicety.

## Commands

```bash
npm run dev        # local dev
npm run build      # client + SSR build — must pass before any commit
npm test           # vitest — golden-file + unit tests, must be green
npx wrangler deploy            # deploy (human-triggered only)
npx wrangler secret put NAME   # secrets — prepare the command, human runs it
```

## Architecture map (where things live)

- `src/lib/ai/` — provider interface, adapters (groq, gemini), failover
  router, response schemas. ALL provider responses are schema-validated at
  this boundary; nothing downstream trusts raw LLM output.
- Deterministic scoring engine (weighted score, tiers, category breakdown)
  — application code. **The only source of numeric truth.**
- Hospitality keyword/synonym map — deterministic matching (Opera PMS,
  Micros, WSET, STCW, HACCP, cruise terms…). Owner knows this domain;
  extend the map rather than asking the LLM to "know" hospitality.
- Template registry — array of `{id, name, description, swatch, purpose,
  Component}`. First element = default template. Shared helpers:
  `CvSection`, `CvEntry` (token-driven), `PremiumPhotoPlaceholder`,
  `dateRange`. Templates: **Vintage (default)**, Winelands, Noir,
  Executive, Harbour, Admiral, Steward.
- `public/fonts/` — self-hosted subsetted woff2 (EB Garamond for Vintage,
  Caladea for Winelands). `font-display: block`. Never load render-path
  fonts from a CDN.
- `tests/fixtures/cvs/` — synthetic CVs only. See Privacy.

## Non-negotiable rules

1. **LLM output never changes a numeric score.** The deterministic engine
   computes final score, categories, and tier. The LLM explains and
   phrases. If a task seems to require the LLM to score, the task is
   mis-specified — stop and flag it.
2. **Golden-file tests are the contract.** 5 fixture CVs with locked exact
   scores. If your change breaks them: either your change is wrong, or you
   intended a scoring change — in which case bump `SCORING_VERSION` and
   regenerate expectations *in the same commit*, and say so in the commit
   message. Never "fix" a golden test by loosening the assertion.
3. **`SCORING_VERSION` salts the KV result cache.** Any change to scoring
   logic, keyword map, or weights bumps it. Forgetting this serves stale
   scores from cache — a silent correctness bug.
4. **Existing templates render byte-identically** when you touch shared
   template components. Extend via *optional* tokens/props with defaults
   preserving current behavior. Spot-check Noir + Harbour after any shared
   change.
5. **Schema-validate every provider response at the boundary** — same
   validator for every adapter. Malformed JSON = provider failure = same
   failover path as a 429.
6. **Graceful degradation over hard failure.** Both providers down must
   still render score + deterministic feedback + confidence. Never an
   infinite spinner, never a zeroed score, never a blank page.
7. **Secrets:** read from env bindings only. Never a literal key in code,
   tests, fixtures, or commit history. The Groq key lives in
   `GROQ_API_KEY` (NOT `ANTHROPIC_API_KEY` — that misnomer was retired;
   if you see it referenced anywhere, that's a bug to fix, not a
   convention to follow). Prepare `wrangler secret` commands for the human;
   don't invent key values.
8. **Free tiers only.** No paid-only AI providers. Design so a paid
   adapter could be added without interface changes, but don't add one.

## Privacy

- Never commit real CV content, real names, emails, or phone numbers.
  Test fixtures are synthetic hospitality CVs with invented people.
- User CV files never leave the browser; only extracted text is
  transmitted and stored. Don't change this boundary.
- Logs may include provider name, latency, outcome, hashes — never CV
  text or personal fields.

## How to work (process)

- **Scope lives in `gethired-build-scope.yaml`.** Work one iteration at a
  time, respect `depends_on`, one commit per task with the given message.
  Don't start iteration N+1 with iteration N unverified.
- **Tests ship in the same commit as the feature.** A task without green
  verification is not done.
- **Feature-flag risky changes** (`MERGED_CALL`, `WORKERS_AI_ENABLED`,
  hybrid extraction). Flags default OFF and must be switchable via env
  without redeploy. Gated tasks where the gate fails are still *complete*
  — record the numbers and leave the flag off.
- **Discovered scope goes to `parking_lot`** in the scope YAML, one line,
  and you move on. Don't build "while we're at it" features.
- **Blocked after 2 fix attempts?** Write `blocked_notes:` under the task,
  continue with non-dependent tasks, surface it in your final report.
- **Never run destructive commands** (`wrangler secret delete`, data
  deletions, force-push) — prepare them and hand to the human.
- **Print-affecting changes** (templates, fonts, print CSS) get a headless
  Chrome print check (`preferCSSPageSize: true, printBackground: true`)
  against the golden PDFs before the task is done.

## Definition of done (every task)

- [ ] `npm run build` passes
- [ ] `npm test` green, including golden files
- [ ] New behavior has its own tests in the same commit
- [ ] No new references to retired names/secrets, no literals, no real PII
- [ ] Templates untouched-by-intent render unchanged (when shared code moved)
- [ ] Commit message matches the scope YAML task
- [ ] Session report states: tasks done, verify results, flags flipped,
      parking-lot additions, anything blocked

## Domain cheat-sheet (so advice stays specific)

ATS = applicant tracking software that filters CVs before humans see them.
Key hospitality systems/certs the keyword map must recognize: Opera PMS,
Micros, Simphony, Fidelio, Lightspeed, Eazywine; HACCP, STCW, WSET
(Levels 1–4), Cape Wine Academy. Cruise lines targeted: Cunard, MSC,
Royal Caribbean, Norwegian, Celebrity. Good feedback is concrete
("Mention Micros POS", "Quantify wine club sign-ups") — generic advice
("add more skills") is a product bug.
