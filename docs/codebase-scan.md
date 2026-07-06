# Codebase Scan — GetHired / Plate & Pen
*Generated: 2026-07-06 — read-only pass, no code changed.*

---

## A. Builder Import / Parse Path

**Status: CONFIRMED — both the checker AND the builder support upload-to-prefill.**

Your hypothesis ("checker has upload, builder is manual only") is **incorrect**. The builder has its own full import path.

### Checker upload (for scoring + silent parse)
`src/routes/tools/cruise-cv-checker.tsx` lines 248–281

1. User drops a file into the checker form (`<input type="file" accept=".txt,.docx,.pdf">`).
2. `extractTextFromFile(file, progressCallback)` runs client-side (mammoth for .docx, pdfjs for .pdf, FileReader for .txt, Tesseract OCR fallback for scanned PDFs). → `src/lib/extractCvText.ts`.
3. On submit, **two** server calls run in parallel via `Promise.allSettled`:
   - `checkCruiseCv({ cvText, roleSlug, jobDescription })` → scoring result
   - `parseCvForBuilder({ cvText })` → structured `ResumeData` (silently, no UI shown)
4. If parse succeeds, `parsedCv` is stored in state. When the user clicks "Build My CV", `saveCvImport(parsedCv, roleSlug)` writes to `sessionStorage` key `zumesco:cv-import` with a 30-minute TTL. → `src/lib/cv-import-handoff.ts`.
5. Navigation goes to `/builder?from=import`.

### Builder: handoff consumption
`src/routes/builder.tsx` lines 160–181

On mount, if `search.from === 'import'`, `consumeCvImport()` reads and **immediately deletes** the sessionStorage entry. The parsed `ResumeData` is mapped through `mapParsedCvToBuilderForm()` (normalises dates, joins bullets → description, strips photo) and loaded into `useResumeStore`. → `src/lib/map-parsed-cv-to-builder.ts`.

### Builder: direct upload (independent of checker)
`src/routes/builder.tsx` lines 192–243

The builder also has its own "Import CV" button (lines 323–346) with `<input type="file" accept=".txt,.docx,.pdf">`. This calls `extractTextFromFile` then `parseCvForBuilder` directly, bypassing the checker entirely. A paste-text fallback is shown when OCR fails (lines 398–426).

**Chain summary:**
```
Upload UI (checker or builder)
  → extractTextFromFile()          client-side  src/lib/extractCvText.ts
  → parseCvForBuilder()            server fn    src/lib/parseCvForBuilder.ts
  → mapParsedCvToBuilderForm()     client-side  src/lib/map-parsed-cv-to-builder.ts
  → useResumeStore.setData()       client state src/lib/resume-store.ts
```

---

## B. Where AI Transforms Text

All AI calls use **Groq `llama-3.3-70b-versatile`** via the OpenAI-compatible endpoint `https://api.groq.com/openai/v1/chat/completions`. The env var `ANTHROPIC_API_KEY` holds the Groq key (historical naming artifact — there is no Anthropic SDK call anywhere in the codebase).

### B1. CV Parse (PARSE)
**File:** `src/lib/parseCvForBuilder.ts` lines 90–123
**In:** raw CV text (max 8,000 chars, sliced at line 108)
**Out:** structured `ResumeData` JSON
**Prompt:** `SYSTEM_PROMPT` constant lines 19–87 — strict zero-hallucination extraction prompt; instructs model to return only provided information verbatim
**Temperature:** 0.0, max_tokens: 2,500
**Classification:** PARSE

### B2. Checker Scoring (SCORE)
**File:** `src/lib/cruise-cv-check.ts` lines 41–111
**In:** CV text (max 6,000 chars), pre-computed keyword signals (matched/missing), deterministic ATS signals, optional job description
**Out:** 7-dimension scored JSON + topFixes[]
**Prompt:** `buildCvCheckPrompt()` in `src/lib/cruiseCvRubric.ts` lines 92–182
**Temperature:** 0.1, max_tokens: 1,500
**Classification:** SCORE

### B3. Writing Checker (TRANSFORM — grammar/spelling only)
**File:** `src/lib/ai/builder-assist.ts` lines 78–126 (`checkWritingFn`)
**In:** a single field's text
**Out:** `WritingSuggestion[]` — array of `{original_substring, suggested_substring, type}`
**Prompt:** `CHECK_WRITING_SYSTEM` constant lines 52–56 — hospitality jargon whitelist, spelling/grammar only
**Temperature:** 0.0, max_tokens: 400, timeout: 4 s, fail-silently
**Classification:** TRANSFORM (surface-level, no content rewriting)

### B4. Content Tailoring / Phrasing Engine (TRANSFORM)
**File:** `src/lib/ai/builder-assist.ts` lines 133–220 (`tailorContentFn`)
**In:** current field text, job title, optional job description, optional other experience entries for de-duplication context, `targetRoleSlug`
**Out:** `{ rewrittenText: string, suggestedSkills: string[] }`
**Prompt:** `TAILOR_SYSTEM_BASE` (lines 59–71) + role-specific pattern block from `src/lib/ai/role-patterns.ts` / `src/data/hospitality-patterns.json`
**Temperature:** 0.3, max_tokens: 800
**Classification:** TRANSFORM — **yes, this rewrites the user's own CV content**. However the system prompt explicitly forbids inventing numbers or employers; it uses placeholder syntax `[X covers/shift]` for missing metrics. The `suggestedSkills` list is presented separately as opt-in chips, never silently merged.

### B5. Phrasing Chips (no AI call — deterministic)
**File:** `src/lib/ai/phrasing-chips.ts` (`getPhrasingChipsFn`)
**Classification:** NOT AI — resolves bullet templates from `hospitality-patterns.json` by slug/text match. No LLM call.

**Does the app rewrite user CV content?** YES — `tailorContentFn` (B4) rewrites whatever text the user has typed in a field, but only on explicit user action (not automatic). The user must click a "Tailor" button in `AssistedTextarea.tsx`. The original text is replaced only after the user accepts.

**Hospitality phrasing engine location:** `src/lib/ai/role-patterns.ts` + `src/data/hospitality-patterns.json` (slug → family → bulletTemplates/promptGuidance). Server-side only, injected into `tailorContentFn` system prompt.

---

## C. Checker vs Builder Architecture

### Routes
| Half | Route file | URL |
|---|---|---|
| Checker | `src/routes/tools/cruise-cv-checker.tsx` | `/tools/cruise-cv-checker` |
| Builder | `src/routes/builder.tsx` | `/builder` |

### Entry components
- Checker: `CruiseCvCheckerPage` (single file, self-contained)
- Builder: `BuilderPage` (imports 6 section components + `PreviewPanel` + `TemplatesPanel`)

### State stores
- **Builder:** `useResumeStore()` in `src/lib/resume-store.ts`
  - Anonymous: `localStorage` key **`hospitality-resume-v1`** (exported as `STORAGE_KEY` from `src/types/resume.ts:98`)
  - Authenticated: Supabase `resumes` table, keyed by `user_id`
- **Checker:** component-local React state only (`useState` for `cvText`, `roleSlug`, `result`, etc.)
  - Draft autosave: `localStorage` key **`checker-draft-v1`** (`cruise-cv-checker.tsx:40`)
  - Cross-page handoff: `sessionStorage` key **`zumesco:cv-import`** (`cv-import-handoff.ts:7`)

**CONFIRMED:** Your assumed keys are correct — `checker-draft-v1` and `hospitality-resume-v1`.

### Shared data model
Both halves share `ResumeData` from `src/types/resume.ts`. The checker parses into `ResumeData` (via `parseCvForBuilder`) and transfers it to the builder via the sessionStorage handoff. They are otherwise architecturally separate — different routes, different state, different persistence strategies.

---

## D. Scoring / Score-Extraction Path

**Status: CONFIRMED — now a single, unified code path.**

### Pipeline steps (`src/lib/cruise-cv-check.ts` lines 41–111)
1. **Deterministic signals:** `runDeterministicChecks(cvText)` — section heading detection, contact info presence, word count, quantified bullet count, garbled text detection. → `src/lib/cvDeterministicChecks.ts`
2. **Keyword alignment:** `scoreKeywordAlignment(cvText, role.keywords, jobDescription)` — string matching against role keyword list, returns `matchedKeywords`, `missingKeywords`, `matchRatio`. → `src/lib/cvDeterministicChecks.ts`
3. **LLM scoring:** Groq `llama-3.3-70b-versatile` with the 7-dimension rubric prompt (B2 above). Pre-computed signals are passed into the prompt so the LLM doesn't re-derive them.
4. **Response parse:** `parseCvCheckResponse(raw)` in `src/lib/cruiseCvRubric.ts` lines 197–242. Strips markdown fences, extracts first JSON object via regex, validates all 7 category scores are numeric. Throws `ScoreParseError` on failure — this propagates to the client as a retryable error message.
5. **Score computation:** `computeCvScore(llmParsed, matchedKeywords, missingKeywords)` lines 254–284 — **fully deterministic, no LLM**. Weighted sum of 7 dimension scores → `overallScore`. Tier derived by `toTierFromScore(score)` lines 247–252: Strong ≥85, Good ≥70, Needs Work ≥50, Major Gaps <50.

**Numeric score and tier band:** Both come from `computeCvScore` / `toTierFromScore` — **the same single function**. There is no longer a separate or contradicting code path for tier vs. score. The earlier bug (strong CVs defaulting to 0) was resolved by the `ScoreParseError` system and robust JSON extraction in `parseCvCheckResponse` (regex `/{[\s\S]*}/` extracts JSON even when surrounded by prose).

---

## E. Resume Generation & Download

### PDF engine
`@react-pdf/renderer` v4.5.1. File: `src/lib/pdf/ResumePDF.tsx`.

### How download works
`src/routes/builder.tsx` lines 249–269 (`handleDownload`):
```ts
const blob = await pdf(<ResumePDF data={data} formatting={data.formatting} />).toBlob();
// → creates object URL → hidden <a> click → revoke
```
This is a fully client-side imperative download (no `PDFDownloadLink`). A full-screen overlay with `Loader2` spinner blocks interaction while generating (`data-testid="pdf-loading"`).

### Templates / swatches
`src/components/templates/registry.ts` — **5 templates** registered:

| ID | Name | Description |
|---|---|---|
| `noir-premium` | Noir | Dark luxury · cruise lines |
| `executive` | Executive | Crisp single-column · management (premium) |
| `harbour` | Harbour | Two-column · hotel & resort (premium) |
| `admiral` | Admiral | Centred header · senior officers (premium) |
| `steward` | Steward | Purple band header · service crew (premium) |

The PDF (`ResumePDF.tsx`) is **a single shared layout** — it adapts colours and section heading styles by template ID but is not a per-template replica. The HTML/Tailwind visual templates in `src/components/templates/premium/` are browser-preview only.

### Multi-page overflow
INFERRED (not directly verified line-by-line): `@react-pdf/renderer` handles page breaks automatically via its layout engine. The scan found `flexWrap: "wrap"` on contact rows and skills rows (`ResumePDF.tsx` lines 293, 366, 689) but no explicit `minPresenceAhead`, `orphans`, or `break-*` properties. Multi-page content will flow but may have suboptimal orphan/widow control.

---

## F. Test Dataset

**CONFIRMED exact path:** `cv-tests/` (not `test-cv` or `cv-test`).

### Files
```
cv-tests/
├── sommelier/
│   ├── Innocent__Chilongo_-_Sommelier.pdf
│   ├── Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf
│   ├── SOMMELIER.pdf
│   ├── SOMMELIER-WINEWAITER.pdf
│   └── WINESTEWARD.pdf
└── waitress/
    └── Amanda_Phiri_CV.pdf
```

All 6 files are PDF format. Based on filenames and the scoring fixture markdown files:

| File | Fixture mapping | Notes |
|---|---|---|
| `WINESTEWARD.pdf` | `sommelier-cv3-winesteward-weakest.md` | Weakest sommelier CV |
| `SOMMELIER-WINEWAITER.pdf` | `sommelier-cv4-sommelier-winewaiter-cunard.md` | Cunard experience |
| `Innocent__Chilongo_-_Sommelier.pdf` | `sommelier-cv5-sommelier-strongest.md` | Strongest candidate |
| `Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf` | INFERRED cv6 or cv7 | Entry-level or off-topic |
| `SOMMELIER.pdf` | INFERRED | Unknown which fixture |
| `Amanda_Phiri_CV.pdf` | Likely cv6 or cv7 waitress persona | Weak-on-topic / negative control |

**Note:** cv3–cv7 are the fixture slugs from `tests/fixtures/cv-scoring/`. The mapping above for the last three files is INFERRED from naming; no explicit mapping file was found.

### Test fixtures (markdown)
`tests/fixtures/cv-scoring/`:
- `sommelier-cv3-winesteward-weakest.md`
- `sommelier-cv4-sommelier-winewaiter-cunard.md`
- `sommelier-cv5-sommelier-strongest.md`
- `sommelier-cv6-weak-on-topic-entry-level.md`
- `sommelier-cv7-negative-control-office-admin.md`
- `loader.ts` — fixture loader

---

## G. Build / Run / Test / Deploy

### Local dev
```
npm run dev   →   vite dev
```
Default URL: `http://localhost:5173` (Playwright `BASE_URL` default, `playwright.config.ts:3`).

### Build
```
npm run build   →   vite build
```

### Deploy
```
npm run deploy   →   vite build && wrangler deploy
```
Cloudflare Pages + Workers via `wrangler.jsonc`.

### Tests

**Unit tests (Vitest):**
```
npm run test   →   vitest run
```
Config: `vitest.config.ts` — jsdom environment, setup file `tests/setup.ts`, includes `tests/unit/**/*.{test,spec}.{ts,tsx}`.

Unit test files:
- `tests/unit/cruiseCvRubric.test.ts` — rubric scoring logic
- `tests/unit/b1-scoring-fixtures.test.ts` — fixture-based scoring accuracy
- `tests/unit/resume-store.test.ts`
- `tests/unit/builder-loading.test.tsx`
- `tests/unit/download.test.tsx`
- `tests/unit/template-count.test.ts`
- `tests/unit/brand-titles.test.ts`
- `tests/unit/sommelierRole.test.ts`
- `tests/unit/free-template.test.ts`
- `tests/unit/step-progress.test.tsx`
- `tests/unit/reveal.test.tsx`
- `tests/unit/faq-height.test.tsx`
- `tests/unit/footer-links.test.tsx`

**E2E tests (Playwright):**
```
npm run test:e2e   →   playwright test
```
Config: `playwright.config.ts` — Chromium only, `tests/e2e/smoke.spec.ts`.

**Combined:**
```
npm run test:all   →   vitest run && playwright test
```

### Required env vars

All read from `.env` (local) / Cloudflare Worker secrets (production):

| Var | Used in | Purpose |
|---|---|---|
| `ANTHROPIC_API_KEY` | `cruise-cv-check.ts:46`, `parseCvForBuilder.ts:93`, `builder-assist.ts:82,137` | **Groq API key** (misnamed — not Anthropic) |
| `VITE_SUPABASE_URL` | `src/lib/supabase.ts` | Supabase project URL (client-exposed) |
| `VITE_SUPABASE_ANON_KEY` | `src/lib/supabase.ts` | Supabase anon key (client-exposed) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server functions only | Supabase admin key |
| `GOOGLE_SHEETS_LEAD_WEBHOOK_URL` | `cruise-cv-check.ts:119` | WhatsApp lead webhook (optional — silently skipped if absent) |

**WARNING:** The `.env` file in the repository root contains live Groq, Supabase anon, and Supabase service role key values in plaintext. The service role key is a long-lived JWT with full DB access. Verify `.env` is in `.gitignore` and not committed to any remote.

---

## Open Questions / Gaps

1. **cv-tests file→fixture mapping:** The exact mapping of `Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf`, `SOMMELIER.pdf`, and `Amanda_Phiri_CV.pdf` to fixture slugs cv3–cv7 was not confirmed — no explicit mapping file found. `loader.ts` would clarify this but its content was not read.

2. **Multi-page PDF overflow:** `ResumePDF.tsx` was only scanned for `wrap`/`break` keywords — a full read of the layout components would be needed to confirm whether page orphan/widow control is implemented.

3. **`src/components/templates/` full list:** The registry shows 5 templates but the glob returned additional template files (`PremiumPhotoPlaceholder.tsx`, etc.) and older template names referenced in CLAUDE.md ("11 templates"). The registry is the source of truth for what's shown in the UI, but dead template files may exist.

4. **Supabase `resumes` table schema and RLS:** Referenced in `resume-store.ts` but `docs/supabase.md` was not read — RLS policy correctness is unverified.

5. **`cv-checker/cruise-cv-check-handler.ts`:** A standalone file outside `src/` containing Groq references was found. Its role (standalone script? old draft?) was not investigated.

6. **Wrangler binding config:** `wrangler.jsonc` was not read — whether Worker bindings, routes, and compatibility dates are correctly set is unverified.

7. **Auth flow completeness:** `sign-in.tsx`, `sign-up.tsx`, and `dashboard.tsx` exist as routes, but their completeness (guarded routes, session management edge cases) was not verified.
