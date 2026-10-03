# Current Product Status

Last updated: 2026-10-03

Preservation follow-up: existing work committed locally by concern; see [validation and inventory](../sessions/2026-10-03-02-commit-preserved-work.md). Production build and 41 focused/regression unit tests pass; 14 TypeScript errors, one mocked persistence E2E failure, and unavailable staging build/dry-run remain. This does not change release readiness.

Current release: Release 0.1 target; no verified released version/tag established.

Current readiness: **NOT READY** for real applicants/public use. Synthetic local development/testing is possible. This label is driven by critical dependency risk, a broken account landing route, unverified data isolation, unsafe recommendation wording, and missing report/save/feedback gates—not by feature count.

Current active feature: audit/documentation completed; next work is historical credential incident containment, an exception to normal F-001-first ordering under spec §32.

## Working

- Public deterministic role-aware scoring without AI calls; local mobile synthetic report reached 56/100 without overflow or page errors.
- Role choice, optional JD, PDF/DOCX/TXT extraction code and paste fallback; parse quality gate and structured failure states.
- Two primary fixes, score/tier and category/keyword UI; seven existing builder templates and PDF generation code/tests.
- New pre-existing draft recovery/save controller: isolated Chromium saving suite 4/4 passed; Android save cases passed in combined run. Mocked cloud, not live authorization proof. Focused preview/CTA suite passed 48/48 across configured desktop/Android projects and explicit viewport sizes.

## Partially Working

- Role profiles lack versions/custom support; free category explanations are generic.
- Parser lacks version/warning contract and a verified binary fixture matrix; OCR cancellation/truncation gaps.
- Recommendations lack consistent evidence/why/if-true constraints.
- Auth UI and builder CV persistence exist but not original report saving.
- Analytics/recovery/mobile accessibility need completion; CRM submission success is unreliable.

## Broken

- /dashboard renders error boundary: No QueryClient set. Hooks also occur after conditional return; Edit/New links target home.
- Completed checker report disappears on refresh; backward/forward cannot reconstruct it.
- One unit test fails (lead payload includes full_name unexpectedly); 14 TypeScript errors; lint fails.
- E2E smoke tests use stale download/mobile preview assumptions; combined run 27 passed/3 failed, isolated save rerun 4 passed.

## Missing

- Custom role with limited specialist coverage and versioned role/analysis/parser/report identity.
- Complete evidence-linked analysis/recommendation contract.
- Report signup/save/retrieval journey and Yes/Partly/No feedback.
- Required funnel metadata, 30+ parser fixtures, 50 manually rated role-analysis cases, live cross-user authorization proof.
- Privacy/support/retention/deletion UX and verified replay masking; reproducible gated release pipeline.

## Current blockers

P0: ISSUE-017 historical credentials; ISSUE-001 critical seroval advisory; ISSUE-002 database isolation unverified; ISSUE-003 public privileged lead/diagnostic/AI boundaries; ISSUE-004 replay/local retention/privacy; ISSUE-005 dashboard; ISSUE-006 report continuity; ISSUE-007 truth constraints. See [KNOWN_ISSUES](KNOWN_ISSUES.md) for evidence and severities.

## Next recommended task

**Continue ISSUE-017 containment:** add and verify the narrow .dev.vars.* ignore rule while preserving existing .gitignore edits; obtain owner/provider invalidation evidence for the mislabeled Groq credential and Supabase service-role credential, resolve webhook exposure, and verify replacement across GitHub/Worker/local consumers. No history cleanup before a separate post-revocation decision. See the [incident record and closure gates](KNOWN_ISSUES.md#issue-017--historical-committed-credentials). Do not infer revocation from a clear source scan.

## Last completed work

[2026-10-03 dirty main preservation](../sessions/2026-10-03-01-preserve-dirty-main.md): classified all 96 original dirty paths; saved exact tracked/nonignored files, deletions, index, binary patches and reachable history in a private ignored local backup. Independent restore reproduced the original dirty status. No history rewrite or issue closure; see journal for recovery location and exclusions.

[2026-09-23 credential incident](../sessions/2026-09-23-01-credential-incident.md): independently confirmed two historical .env blobs across 844 reachable blobs; no credential-pattern or historical-value matches in 343 existing tracked/nonignored files, and no index pattern matches. Documented service mapping, CI replacement risks, ignore gap and owner-only closure evidence. ISSUE-017 remains OPEN.

[2026-09-22 cleanup](../sessions/2026-09-22-02-cleanup.md): removed 36 unused source files, 30 direct dependency declarations, dead checker copy and two tracked generated test outputs. Scoped lint/format ignores to avoid generated output and archived worktrees. Existing saving changes preserved.

[2026-09-22 audit](../sessions/2026-09-22-01-audit.md): specification, source, git, dependencies, data/AI/analytics, cleanup inventory, build/type/lint/unit checks and local browser verification. [Full audit entry](../../audit.md).

## Important warnings

- This checkout started dirty on main at d84292a. Save-flow edits and the spec already existed uncommitted; do not reset or overwrite them. No commit/deploy/migration was performed.
- Build passed in GETHIRED_LOCAL_SAVE_TEST=1 mode; this is not production configuration verification.
- No live database policies, applicant data or live model quality were tested. Current nonignored text-file pattern scan found no credential match; a separate scan of 786 historical text blobs found two .env versions with matches. See ISSUE-017. Neither scan establishes credential validity or absence of other secret types.
- Existing older launch/audit plans remain historical; their test counts and separate-store finding are superseded for this working tree.
- Future sessions must follow AGENTS.md continuity steps and update status, session journal, issues, roadmap/decisions when applicable.
