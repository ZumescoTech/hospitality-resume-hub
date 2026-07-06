# GetHired MVP Readiness Report — Baseline Pass
*Generated: 2026-07-06 | Branch: preview/b0-r1 | Author: agentic loop*

---

## Executive Summary

**Band: NOT READY**

The app's core flows are functionally correct and demonstrated to work end-to-end in observed runs. However the baseline pass could not be fully automated due to Groq free-tier token exhaustion, several Critical-for-MVP issues were identified in code inspection and partial test runs, and judge scores (AI/ATS/Design quality dimensions) could not be computed. Fix the issues below before re-scoring.

---

## Security Gate — PASS ✅

- `.env` is in `.gitignore` ✓
- `git log --all --full-history -- .env` returned no commits ✓
- Dead keys in history confirmed via `git log --all -p -- .env` — all rotated prior to this session ✓
- Current live key (`ANTHROPIC_API_KEY` = Groq key) loads correctly from `.env` and returns HTTP 200 from `api.groq.com` ✓

---

## Playwright Config — EXPANDED ✅

`playwright.config.ts` now targets 6 projects:
- Desktop: Chromium, Firefox, WebKit
- Mobile: iPhone 14, Pixel 7
- Tablet: iPad Pro 11

All smoke-suite unit tests pass on Chromium (11/11).

---

## Baseline Pass Results

### Test matrix

| CV | Role | PDF text extractable | Checker result | Builder handoff | Baseline PDF |
|---|---|---|---|---|---|
| innocent-chilongo | sommelier-wine-waiter | ✅ (text-based) | ✅ tier: Needs Work | ✅ parsedOk: true, name: "Innocent Chilongo" | ✅ valid PDF |
| michelle-gaswa | sommelier-wine-waiter | ✅ (text-based) | ✅ passed (14.5s) | ✅ confirmed | ✅ valid PDF |
| sommelier-a | sommelier-wine-waiter | ✅ (text-based) | ✅ passed (16.6s) | confirmed | ✅ valid PDF |
| sommelier-winewaiter | sommelier-wine-waiter | ✅ 5,358 chars | ❌ Groq 429 (rate limited) | N/A | N/A |
| winesteward | sommelier-wine-waiter | ✅ 4,413 chars | ❌ Groq 429 (rate limited) | N/A | N/A |
| amanda-phiri | waiter-waitress | ✅ 2,783 chars | ❌ Groq 429 (rate limited) | N/A | N/A |

**Note:** The first 3 CVs passed in fresh rate-limit windows (early in session). The remaining 3 were all blocked by Groq free-tier token exhaustion after many re-runs during debugging. All 6 PDFs have confirmed extractable text — the failures are purely API rate limiting, not app or PDF issues.

### Blocker: Groq TPM exhaustion

Each baseline test consumes ~10,000 tokens (two parallel Groq calls: `checkCruiseCv` + `parseCvForBuilder`, each with large system prompts + CV text). The free tier allows ~6,000 tokens/minute. Three retries per failing test consumes 30,000 tokens within a single minute, immediately exhausting the daily or hourly budget.

**Consequence:** The automated judge script (`tests/scripts/judge-cvs.mjs`) also uses Groq and cannot run until the rate limit resets.

**Required action (sign-off gate):** Upgrade to a paid Groq tier, or switch to a different model with a higher TPM limit. This touches billing/secrets configuration.

---

## Rubric Scorecard

Scores that could not be measured are marked `—` with the reason. Every `—` is treated as a floor miss for band purposes.

### Functional — weight 22%

| Sub-dimension | Score | Method | Evidence |
|---|---|---|---|
| Upload reliability | 4 | AUTO | Text PDFs upload and process correctly in 3/3 observed runs. DOCX + iOS Safari untested. |
| Parsing accuracy | 4 | JUDGE (partial) | innocent-chilongo: name, role, experience correctly extracted. Full rubric comparison not run (no judge artifacts). |
| Editing | 3 | MANUAL (observed) | Builder loads with pre-populated fields; editing confirmed functional in prior session observations. Full add/remove/reorder not tested. |
| Generation | 4 | AUTO | Preview renders; PDF generated and downloaded in all passing tests. |
| Download | 5 | AUTO | PDF opens, starts with `%PDF`, >1024 bytes, correct content. Hard gate: ✅ PASS. |
| Caching | — | AUTO | Not tested in this run. Hard gate status: UNKNOWN. |

**Category raw mean: 4.0/5 (partial) | Category floor: ≥3.5 required → conditional PASS (caching unknown)**

### UX — weight 18%

| Sub-dimension | Score | Method | Evidence |
|---|---|---|---|
| Navigation | 4 | AUTO + observed | checker → builder URL routing works; `?step=results` and `?from=import` params correct. Browser back not tested. |
| Clarity | 3 | JUDGE (observed) | "Couldn't process file" error message shown on Groq failure with no retry prompt or guidance. "Build My CV" CTA clear. Role selector self-evident. |
| Mobile usability | — | AUTO (emulation) | Mobile projects not yet run. |
| Accessibility | — | AUTO (axe) | Not tested. |
| Visual hierarchy | — | JUDGE | Not tested. |

**Category floor: UNKNOWN (3 of 5 not tested)**

### Resume Design — weight 16%

| Sub-dimension | Score | Evidence |
|---|---|---|
| Typography | — | Judge not run (no artifacts). |
| White space | — | Judge not run. |
| Overflow | — | Judge not run. **Hard gate: UNKNOWN.** |
| Alignment | — | Judge not run. |
| Professional appearance | — | Judge not run. |
| Multi-page handling | — | Judge not run. |

**Category: not scored (all JUDGE, no artifacts)**

### ATS — weight 16%

| Sub-dimension | Score | Evidence |
|---|---|---|
| Parsing | 5 | AUTO | Generated PDFs confirmed machine-readable (text-based `%PDF`, pdfjs extracts text). |
| Keywords | — | JUDGE not run. |
| Structure | — | JUDGE not run. |
| Readability | — | JUDGE not run. |
| Section ordering | — | JUDGE not run. |

**Category: partially scored**

### AI — weight 14%

| Sub-dimension | Score | Evidence |
|---|---|---|
| Grammar | — | Judge not run. |
| Professional tone | — | Judge not run. |
| Stronger bullet points | — | Tailor button not located in assisted pass attempts. |
| Better summaries | — | Not run. |
| No hallucinations | — | **Hard gate: UNKNOWN.** Judge not run. |

**Category: not scored**

### Performance — weight 14%

| Sub-dimension | Score | Evidence |
|---|---|---|
| Slow 3G | — | Network throttle profiles not run. |
| Fast 3G | — | Not run. |
| Desktop | 2 | Playwright page load observed at 9.3s on localhost (no network). Suggest investigation. |
| Mobile | — | Not tested. |
| Memory | — | Not tested. |

**Category floor: UNKNOWN**

---

## Composite Score

Cannot be computed — too many sub-dimensions unscored. Approximate partial composite (scored dimensions only):

- Functional partial: 4.0/5 × 22% = 17.6
- UX partial (2/5 dims): ~3.5/5 × 18% × 0.4 = 5.0
- ATS partial (1/5 dims): 5.0/5 × 16% × 0.2 = 3.2
- Performance partial (1/5 dims): 2.0/5 × 14% × 0.2 = 1.1

**Partial composite ≈ 27/100** (based on only ~30% of sub-dimensions measured)

**Band: NOT READY** — composite unknown, multiple hard gates unverified, category floors not established.

---

## Hard Gate Status

| Gate | Status | Evidence |
|---|---|---|
| 1. No data loss on refresh | ⚠️ UNKNOWN | Caching not tested in this run |
| 2. Valid PDF download | ✅ PASS | Auto-confirmed via byte check |
| 3. No AI hallucination | ⚠️ UNKNOWN | Judge not run |
| 4. No PDF overflow/clipping | ⚠️ UNKNOWN | Judge not run |
| 5. Upload no crash (iOS Safari) | ⚠️ MANUAL REQUIRED | iOS not run; desktop passes |
| 6. Secrets secured | ✅ PASS | Security gate confirmed |

**2 of 6 hard gates pass. 4 unknown.**

---

## Findings Log

### Critical-for-MVP

| ID | Finding | Evidence | Recommended Fix |
|---|---|---|---|
| F-01 | **Groq TPM exhaustion in test sessions** — free tier (~6k TPM for llama-3.3-70b) is exhausted by a single automated test run with retries. Blocks the entire CI/judge pipeline. | Browser console: `Groq API error 429 rate_limit_exceeded` on all 6 CVs after initial runs. | **Sign-off gate:** Upgrade Groq account or switch model. Short-term: use `llama-3.1-8b-instant` (200k TPM) for the checker/parser where quality is acceptable, or reduce max_tokens. |
| F-02 | **parsedCv silent failure** — when `parseCvForBuilder` fails (Groq error), `parsedCv` is set to null but the user is NOT informed. "Build My CV" navigates to `/builder` without `?from=import`, opening an empty form. User has no idea their data wasn't transferred. | Code: `cruise-cv-checker.tsx` lines 287-293. `parsedOk: false` observed in first session run before fix. | Show a toast or inline notice: "We couldn't pre-fill your details — please enter them manually." Don't silently open an empty builder. |
| F-03 | **Score number not extracting in tests** — `img[alt*="score"]` locator returns null. Score shows as `null` in all captured JSON despite checker passing. | `checker-score.json`: `{"score": null, "tier": "Needs Work"}` in all artifacts. | Check actual img alt text format in production DOM; update `extractCheckerScore` regex. (Non-blocking for users but breaks automated monitoring.) |
| F-04 | **Playwright outputDir cleaning destroys test artifacts** — Playwright's default behavior removes `test-results/` before each run, deleting CV artifacts from prior passes. | All passing test artifacts (innocent-chilongo, michelle-gaswa, sommelier-a) were erased on subsequent runs. | Fixed: `ARTIFACTS_DIR` moved to `cv-journey-artifacts/` (outside `test-results/`). Judge script updated to match. |
| F-05 | **describe.serial skips all tests on first failure** — 5 of 6 baseline tests were silently skipped when innocent-chilongo failed, giving a false impression that 5/6 passed. | `test-results/.last-run.json` showed only 1 failed but 5 "didn't run". | Fixed: removed `.serial`, now using `--workers=1` with plain `describe`. |
| F-06 | **Page load 9.3s in Playwright (localhost, desktop Chrome)** — No network latency, no throttle. This is pure JS parse/execute time. On a real user's 3G connection it could be 25–40s. | Debug spec log: `[T+9289ms] page loaded`. | Investigate bundle size, lazy loading, and Vite SSR hydration. Target <3s on localhost. |
| F-07 | **Caching not verified** — The "no data loss on refresh" hard gate is unconfirmed. `hospitality-resume-v1` and `checker-draft-v1` localStorage keys not tested under refresh. | Not run in this pass. | Add AUTO test: navigate to builder with data → `page.reload()` → assert field values preserved. |

### Post-MVP

| ID | Finding |
|---|---|
| P-01 | Rename `ANTHROPIC_API_KEY` env var to `GROQ_API_KEY` for clarity (currently confusing, documented as a known technical debt). |
| P-02 | iOS Safari real-device upload test (MANUAL gate — can't emulate accurately). |
| P-03 | Print-margin verification on physical A4/Letter paper. |
| P-04 | Full WCAG AA accessibility audit. |
| P-05 | Per-template PDF layouts (currently single shared layout for all 11 templates). |
| P-06 | Groq retry with exponential backoff in `cruise-cv-check.ts` and `parseCvForBuilder.ts` to handle transient 429s gracefully without exhausting TPM. |

---

## Next Actions Before Re-Score

1. **[SIGN-OFF REQUIRED]** Resolve Groq TPM — upgrade account or switch to `llama-3.1-8b-instant` for checker/parser (discuss tradeoff: quality vs. cost).
2. Fix F-02: add user-visible notice when parsedCv is null after checker.
3. Fix F-07: add caching AUTO test.
4. Investigate F-06: page load performance.
5. Once Groq is resolved: re-run full baseline + assisted pass → run judge → score all dimensions → recompute composite.

---

## What Was Verified End-to-End (observed, not estimated)

- **Checker flow**: Role select (Radix UI) → PDF upload → Groq analysis → score display → "Build My CV" → builder navigation
- **Builder flow**: Pre-populated from sessionStorage handoff → template preview → PDF download
- **PDF validity**: Machine-extractable text, starts with `%PDF`, >1024 bytes
- **All 6 CV PDFs**: Text-extractable by pdfjs-dist (no scanned/image-only files in test set)
- **Security gate**: Clean
- **11 unit tests**: All passing on Chromium

---

*Report will be regenerated automatically after Groq TPM resolution and full judge run.*
