# Release 0.1 checklist

2026-09-22. All boxes remain open until the actual release gate is verified. Partial implementation credit in PRODUCT_GAP_ANALYSIS.md is not a checked release gate. Use synthetic staging data; never use another applicant record for authorization testing.

## Prerequisite safety gates

- [ ] Historical credential exposure contained, revocation/rotation documented without values (ISSUE-017).
- [ ] Critical serialization dependency remediated and deployed version verified (ISSUE-001).
- [ ] A/B/anonymous database access tests pass; schema and RLS captured reproducibly.
- [ ] Public privileged endpoints bounded/authorized; diagnostics restricted and redacted.
- [ ] Clarity masking/consent and retention/deletion paths verified.
- [ ] Unit, typecheck, scoped lint, build and actual E2E journey pass.
- [ ] Staging isolated; reproducible CI validation and explicit release approval in place.

## F-001 feature gates

- [ ] Role selection works on supported mobile breakpoints.
- [ ] Role selection works on desktop.
- [ ] Every supported role resolves to exactly one active role profile.
- [ ] Custom role flow works.
- [ ] Unsupported role limitations are communicated.
- [ ] Role reaches the analysis engine correctly.
- [ ] Different roles create meaningfully different analysis.
- [ ] Analytics include valid role metadata.
- [ ] 50-analysis regression matrix passes relevance threshold.
- [ ] Zero candidate-fact fabrication in test set.
- [ ] Error states have recovery paths.

## F-002 feature gates

- [ ] PDF happy path passes.
- [ ] DOCX happy path passes.
- [ ] Configured max size enforced.
- [ ] Unsupported file gets clear message.
- [ ] Empty/corrupt fixtures rejected.
- [ ] Image-only failure is not treated as valid text extraction.
- [ ] Multi-column fixtures manually reviewed.
- [ ] Parser result is schema validated.
- [ ] Analysis never runs on invalid parser result.
- [ ] Parser version stored.
- [ ] No raw CV data found in analytics payloads/log inspection.
- [ ] ≥95% supported fixture parse success.

## F-003 feature gates

- [ ] Structured output schema exists.
- [ ] Schema validation is enforced.
- [ ] Malformed model output cannot render as success.
- [ ] Candidate facts are not fabricated in launch test set.
- [ ] Prompt injection fixtures fail safely.
- [ ] Role context changes analysis appropriately.
- [ ] Evidence vs missing evidence is distinguished.
- [ ] Scores stay within valid bounds.
- [ ] Analysis version is persisted.
- [ ] Failure mode is recoverable.
- [ ] Major findings are manually traceable to evidence.

## F-004 feature gates

- [ ] Exactly 1–3 primary recommendations display when issues exist.
- [ ] Recommendations are ordered by priority.
- [ ] Each recommendation includes why it matters.
- [ ] Each recommendation includes evidence state.
- [ ] Each recommendation provides an actionable next step.
- [ ] No recommendation instructs fabrication.
- [ ] Secondary findings do not overwhelm the primary fixes.
- [ ] Engagement analytics fire.

## F-005 feature gates

- [ ] Report is usable at common mobile widths.
- [ ] Top 3 fixes are visible without navigating a complex dashboard.
- [ ] Score meaning is explained.
- [ ] Role context is visible.
- [ ] Error/retry states exist.
- [ ] Keyboard interaction works for key controls.
- [ ] Focus states are visible.
- [ ] No color-only status.
- [ ] Report-view analytics fire once appropriately.

## F-006 feature gates

- [ ] Signup entry point exists from report.
- [ ] Successful signup preserves analysis.
- [ ] Saved report can be retrieved by owner.
- [ ] Cross-user access test is blocked.
- [ ] Auth failure has recovery path.
- [ ] Signup and save analytics work.
- [ ] No private CV/report data is exposed in public URLs.

## F-007 feature gates

- [ ] Feedback control appears after report value is visible.
- [ ] Feedback persists.
- [ ] Optional comment works.
- [ ] Duplicate/spam behavior is reasonably controlled.
- [ ] Feedback can be associated with analysis version and role.
- [ ] Submission failure does not break report.

## Master gates from specification section 33

### Product
- [ ] Target role drives analysis.
- [ ] Supported-role list is deliberately limited.
- [ ] Custom role is handled honestly.
- [ ] PDF/DOCX upload works.
- [ ] Invalid parsing stops analysis.
- [ ] Analysis is structured and validated.
- [ ] Top 3 fixes are actionable.
- [ ] Report explains score/context.
- [ ] User can save after receiving value.
- [ ] Feedback is captured.

### Trust
- [ ] No fabricated candidate facts in regression test.
- [ ] No fake ATS guarantee.
- [ ] No hiring guarantee.
- [ ] Unsupported roles do not masquerade as supported expertise.
- [ ] CV prompt injection does not override system logic.

### Reliability
- [ ] Common PDF fixtures work.
- [ ] Common DOCX fixtures work.
- [ ] Parse failure is recoverable.
- [ ] Model failure is recoverable.
- [ ] Malformed output is rejected.
- [ ] Signup does not lose report.

### Privacy/security
- [ ] Secrets stay server-side.
- [ ] Saved analyses are authorized.
- [ ] Raw CV content absent from general analytics.
- [ ] Routine logs contain no raw CV text.
- [ ] Uploaded content is treated as untrusted.
- [ ] Public URLs do not expose private reports.

### Analytics
- [ ] Core funnel events fire.
- [ ] Failure codes are measurable.
- [ ] Role/version metadata is recorded.
- [ ] Analytics contain no CV PII.

### UX
- [ ] Core flow works on mobile.
- [ ] Primary action is obvious.
- [ ] Loading states exist.
- [ ] Error recovery exists.
- [ ] Basic keyboard/accessibility checks pass.
- [ ] Result is understandable without founder explanation.

### QA
- [ ] 30+ parser fixtures.
- [ ] 50 role-analysis regression cases.
- [ ] ≥80% manual `Relevant` target.
- [ ] 0 fabricated candidate facts.
- [ ] Main E2E happy path green.
- [ ] Main failure paths green.

---

## Release and observe

- [ ] Founder/internal synthetic alpha: critical matrix green.
- [ ] Closed beta: approximately 10-25 consented applicants with monitoring; feedback target at least 80% Yes + Partly, no repeated severe trust issue.
- [ ] Limited public: controlled traffic only after recovery, privacy and funnel reliability are established.
- [ ] Public: measured stable core flow, tested failure paths, support/rollback/observation ready.
- [ ] Owner approves concrete release and deployment configuration.
- [ ] Observe parse/analysis failure, recommendation engagement, save and feedback; select later features from recurring need.
