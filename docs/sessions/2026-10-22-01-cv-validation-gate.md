# ISSUE-018 — CV document validation gate

Date: 2026-10-22. Branch `main`, starting HEAD `6412072`. Status: **FIXED locally, not deployed**. Release 0.1 remains **NOT READY**.

## Objective

Owner supplied *Get Hired MVP Release Brief v1.0 (14 Oct 2026)*. Its section 3A names a known defect: the checker scores almost any uploaded document. This session implements that P0 item (Sprint 1 "validation gate") only. The rest of the brief is mapped below, not implemented.

## What changed

- `src/lib/cvDocumentClassifier.ts` (new): deterministic classifier, `CLASSIFIER_VERSION = '1'`. It returns `valid_cv`, `uncertain` or `not_a_cv` with a reason. CV evidence: contact details, line-level section headings, date ranges, role terms and bullet lists. Non-CV markers: cover letter, invoice, bank statement, certificate and assignment phrases (3+ hits needed). Filenames and the bare word "CV" are not used as evidence. No AI call.
- `src/lib/cruise-cv-check.ts`: new `documentGate()` runs the existing parse-quality gate and then the classifier **before the KV cache lookup**, so a cached score cannot bypass it. `not_a_cv` cannot be overridden. `uncertain` returns no score until the request carries `confirmedCv: true`.
- `CvCheckOutcome` gains `not_a_cv` and `uncertain_document`; telemetry and Clarity event unions were extended (this also fixes the previously untyped `cv_parse_failed` event, so TS errors go from 15 to 14).
- Checker UI: dedicated headings, the reason, plus **Start a CV from scratch**, **Try again with a different file** and, for uncertain files, **Yes, this is my CV — check it**.
- Fixtures: `tests/fixtures/documents/` holds synthetic beginner CVs and non-CVs (cover letter, invoice, bank statement, certificate, assignment, recipe, menu).

Scores for genuine CVs are unchanged, so `SCORING_VERSION` is not bumped and golden tests are untouched.

## Verification

- `tests/unit/cv-document-classifier.test.ts`: 39 PASS. All 21 CVs are classified `valid_cv` (14 `cvs/`, 5 `cv-scoring/`, 2 beginner CVs), with evidence ≥ 6. All 7 non-CVs score ≤ 4 and are classified `not_a_cv`.
- `tests/unit/check-cruise-cv-document-gate.test.ts`: 9 PASS. Non-CVs never read or write the cache, confirmation cannot override `not_a_cv`, and uncertain inputs are scored only after confirmation.
- Full unit run: **675 passed / 3 failed / 13 skipped**. The failures are the known `full_name` lead-payload mismatch and two `desktop-two-pane` load timeouts, which pass 9/9 in isolation.
- `npm run build`: PASS.
- Not done: a browser check of the new UI states, and a test on real binary PDF/DOCX non-CVs (the fixtures are extracted text).

## Limits

The evaluation set is small: 21 positives and 7 negatives. It cannot substantiate the brief's 98% / 99% gates; the brief itself requires 30+ CVs plus a substantial negative set. A certificate without its usual phrasing scores 4 evidence points, the minimum for `valid_cv`. Expand the negative set before relying on the thresholds.

## Brief vs. repository — owner decisions needed

1. **Templates.** The brief asks for exactly five templates: Classic Professional, Modern Hospitality, Hospitality Leadership, Career Starter and Cruise Specialist. The repo has seven (Vintage default, Winelands, Noir, Executive, Harbour, Admiral, Steward). The scope YAML release gate says "6 templates". These need a decision on how to map, rename or retire.
2. **Score labelling.** The brief requires the score to be described as an internal readiness indicator, not an official ATS score. Landing and checker copy still say "ATS score".
3. **Builder steps.** The brief specifies five guided steps; the current builder step model differs.
4. **Persistence.** The brief asks for IndexedDB, a service worker and Saved/Syncing/Synced/Offline states with conflict handling. The current drafts use localStorage plus Supabase.
5. **Documentation names.** The brief names `/docs/PRODUCT_SCOPE.md` and others; the repo keeps equivalents in `docs/project/`. The brief allows adapting names.

Items already tracked: ISSUE-007 (truth constraints / no invented facts), ISSUE-008 (parser and OCR), ISSUE-006 (report continuity) and ISSUE-004 (privacy/retention).

## Next steps

Owner decisions on items 1–4 above. Then expand the labelled negative set. Then continue Sprint 1: structured fact extraction with explicit ambiguity, and evidence-linked feedback (ISSUE-007).
