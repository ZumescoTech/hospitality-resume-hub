# GetHired — Fault Injection Test Plan & Telemetry Spec

A working checklist for testing failure containment across the CV builder/scoring pipeline, and the minimum telemetry needed to catch regressions automatically instead of by manual UAT.

Principle throughout: **a fault (one bad input/one dependency hiccup) should never silently become a failure (wrong or broken output shown to the user).** Every test below asks "what does GetHired actually show the user when this breaks?" — not just "does it crash."

---

## 1. PDF Upload & Parsing

This is your known weak point (source of the 0/100 scoring bug), so it gets the most detail.

### Test cases — malformed/edge-case inputs
| # | Input | Expected behavior |
|---|---|---|
| 1 | Scanned/image-only PDF (no extractable text layer) | Detect no-text-layer condition explicitly; show "we couldn't read text from this PDF, try re-exporting from Word" — never a silent 0/100 |
| 2 | PDF with embedded fonts that don't map to standard encoding (common with some export tools) | Garbled-text detection (e.g. high ratio of non-printable/replacement characters) triggers a distinct error state, not a low score |
| 3 | Password-protected / encrypted PDF | Explicit "file is protected" message, not a generic parse failure |
| 4 | Corrupted PDF (truncated file, bad header) | Fails fast with a clear message; doesn't hang the request |
| 5 | Multi-column CV layout (common in creative templates) | Parser either handles column order correctly or flags "layout may affect parsing accuracy" — verify it doesn't silently interleave columns into nonsense text |
| 6 | CV with tables (skills matrices, etc.) | Check what happens to tabular text — often the biggest source of garbled extraction |
| 7 | Very large PDF (10+ pages, high-res embedded photos) | Timeout/size limit behavior — should reject gracefully with a size message, not silently truncate content used for scoring |
| 8 | Empty PDF / near-empty (just a header/logo) | Should fail the "insufficient content" check, not score it |
| 9 | Non-English CV text (if you expect any international cruise-line applicants) | Confirm scoring engine doesn't misinterpret this as garbled/empty content |
| 10 | PDF exported from Canva/Pages/Google Docs (three different rendering engines) | Each has different quirks in text extraction — test all three explicitly since users will use all three |
| 11 | .docx or .doc uploaded despite PDF-only UI copy | Confirm the upload boundary actually rejects it with a clear message rather than attempting to parse binary garbage as PDF |

### The core fix for the 0/100 bug pattern
Right now (per what you described) a parse failure and a "genuinely weak CV" both seem to be able to produce the same output shape (a low/zero score). The fix is a **third state**, not a better scoring algorithm:

```
enum ScoreResult {
  Scored(score, breakdown)
  ParseFailed(reason)   // never rendered as a numeric score
  InsufficientContent(reason)
}
```

Test: for every case in the table above, assert the result is `ParseFailed` or `InsufficientContent`, and assert your UI has a distinct render path for those states that is visually different from a low score — not just "0/100" with no explanation.

### Telemetry to add
- **Parse failure rate** — % of uploads that hit `ParseFailed`/`InsufficientContent`, tracked daily. A spike tells you a new export tool or template is breaking parsing before users complain.
- **Score distribution histogram** — if genuine scores cluster suddenly near 0, that's the same bug shape as before, catchable without waiting for a support message.
- **Extraction character count vs. file size** — a crude but effective signal for "did we actually get real text out of this," logged per upload.
- **Time-to-parse** — catch the large-PDF timeout case before it becomes a hung request.

---

## 2. Groq Judge API (scoring/AI phrasing)

### Fault injection tests
| # | Injected fault | Expected behavior |
|---|---|---|
| 1 | Judge API times out (simulate with an artificial delay/mock) | Falls back to cached/simpler heuristic score OR shows "scoring temporarily unavailable, try again" — never a stuck spinner or silent zero |
| 2 | Judge returns malformed JSON (not matching expected schema) | Caught and logged distinctly from a legitimate low score; retried once before falling back |
| 3 | Judge API rate-limited (429) | Backoff + retry logic actually exercised, not just assumed to exist |
| 4 | Judge API down entirely (kill the mock/simulate 500) | Whole CV builder flow doesn't hard-fail — user can still save/export CV even if scoring is unavailable |
| 5 | Judge returns a score wildly outside expected range (e.g. negative, >100) | Clamped/validated, not passed through to UI raw |

### Telemetry
- Judge API error rate (timeouts, 4xx, 5xx) as a dashboard metric, not just logs you'd have to go find
- Retry count and fallback-triggered count — if fallback fires often, that's a reliability problem worth fixing upstream
- p50/p95 latency on judge calls — lets you catch creeping slowness before it becomes user-visible timeouts

---

## 3. Photo Compliance Checker

### Fault injection tests
| # | Injected fault | Expected behavior |
|---|---|---|
| 1 | Photo checker service/call fails mid-request | CV flow continues with "photo compliance unverified" rather than blocking the whole CV |
| 2 | No photo uploaded at all | Distinct from "photo failed compliance" — don't conflate missing with non-compliant |
| 3 | Non-image file uploaded as photo | Rejected with clear message, not passed to the checker and crashing it |
| 4 | Extremely large image file | Size/timeout handling, same pattern as the PDF size test |

### Telemetry
- Photo check failure rate, split by "technical failure" vs. "genuinely non-compliant photo" — these need different logging, or you'll never know if the checker itself is breaking

---

## 4. Job Posting Match Mode

### Fault injection tests
| # | Injected fault | Expected behavior |
|---|---|---|
| 1 | Empty/garbage job description pasted in | Graceful "couldn't extract enough detail from this posting" rather than a nonsensical match score |
| 2 | Extremely long job posting (full page scrape) | Truncation handled predictably, not silently dropping the important bits (e.g. requirements section) |
| 3 | Job posting in a language other than English | Confirm behavior is defined (reject vs. attempt) rather than undefined |

---

## 5. Template Rendering (Noir, Executive, Harbour, Admiral, Steward, + new Garamond default)

### Fault injection tests
| # | Injected fault | Expected behavior |
|---|---|---|
| 1 | CV data with missing optional fields (no photo, no summary, empty skills array) | Every template renders cleanly with sensible fallbacks, no broken layout/empty boxes |
| 2 | Very long field values (long job titles, long bullet points) | Text overflow handled (wrap/truncate), not breaking the PDF export |
| 3 | Special characters / unicode in name or content (accents, non-Latin names) | Renders correctly across all templates, especially the new Garamond/red serif one |
| 4 | Switching templates mid-edit with partially filled data | No data loss, no crash |

---

## 6. Deployment / Environment (Cloudflare Workers)

- **Staging environment**: confirm you have a separate Worker + separate KV/D1 namespace from production before testing any of the above against real data. If not, that's step zero before running fault injection at all — you don't want a parse-failure test corrupting a real user's saved CV.
- **Rollback**: time yourself doing a rollback of the last deploy. If it's not near-instant, that's a gap worth closing before you ship the Garamond template as default.
- **Recompute path**: if the scoring engine gets fixed (like the 0/100 bug), do you have a way to re-score previously-affected CVs, or are those users stuck with a wrong score until they re-upload?

---

## Suggested telemetry dashboard (minimum viable)

A single dashboard with these 6 numbers, checked daily, would have caught the 0/100 bug automatically:

1. Parse failure rate (uploads)
2. Score distribution (histogram, flags anomalous clustering near 0)
3. Judge API error rate
4. Photo check technical-failure rate
5. p95 latency (upload → score)
6. Deploy-to-rollback time (tracked per incident, not daily)

If you're on Cloudflare Workers, Workers Analytics Engine or just structured logs pushed to a lightweight dashboard (even a simple KV-backed counter page) would cover this without much infra overhead.

---

## Suggested order of attack

1. Fix the parse-failure/score conflation (Section 1's core fix) — this directly addresses the bug you already hit and is the highest-leverage change.
2. Add the score distribution + parse failure rate telemetry — cheapest to build, immediately gives you an early-warning system.
3. Run the PDF edge-case table against your three real export sources (Word, Canva, Google Docs) manually once, log results.
4. Add judge API fallback behavior if it doesn't already exist.
5. Set up staging environment if not already separate from production.
6. Work through photo/job-match/template edge cases as time allows — lower frequency of user impact than the above.
