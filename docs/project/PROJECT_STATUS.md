# Current Product Status

Last updated: 2026-10-06

ISSUE-002: **CLOSED for the assigned resume database scope**, verified 2026-10-06. Six-column migration, explicit CRUD ownership RLS, restricted effective grants, JSON-object constraint, owner/latest index and server-managed timestamps reproduced on the dedicated local Supabase stack. **49 pgTAP checks + 185 direct Data API assertions PASS**, including both A/B directions and signed-out requests; fixtures cleaned up. Focused persistence/auth **26/26 PASS**; synthetic-config production build PASS; read-only security review found no blockers. No production migration/deployment or hosted authorization proof. Separate shared report-cache privacy and saved-analysis gates remain unresolved. See [verification journal](../sessions/2026-10-06-01-issue-002-resume-rls-verification.md).

ISSUE-001 is **PASS / CLOSED** on owner-supplied verified results recorded 2026-10-04. Tests: **629 passed / 13 skipped / 1 pre-existing `full_name` payload mismatch** (not introduced by ISSUE-001). Production build, staging build and diff whitespace check: **PASS**. Remaining npm audit findings: **17 (10 high, 6 moderate, 1 low)**, outside ISSUE-001 and unresolved. See [closure evidence](../sessions/2026-10-04-01-issue-001-closure.md). This documentation session did not rerun validation.

Current regression evidence: full unit run **628 passed / 2 failed / 13 skipped** (known `full_name` mismatch plus builder-import timeout; isolated builder rerun **2/2 PASS**). TypeScript reports **15 errors** in unchanged application sources; repository lint remains failing, while the new isolation script passes scoped lint. Historical E2E failures remain unresolved and were not rerun for this database-only change. Release readiness is unchanged.

Current release: Release 0.1 target; no verified released version/tag established.

Current readiness: **NOT READY** for real applicants/public use. Synthetic local development/testing is possible. This label is driven by a broken account landing route, unverified data isolation, unsafe recommendation wording, and missing report/save/feedback gates—not by feature count.

ISSUE-017 is **CLOSED** on the recorded 2026-09-27 owner confirmation of credential rotation and access review. Repository remediation and closure evidence are reconciled into main; historical Git objects remain. No new provider verification was performed.

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
- Known unit contract failure (lead payload includes full_name unexpectedly); 15 TypeScript errors in the current run; lint fails. The full-run builder-import timeout passed in isolation.
- E2E smoke tests use stale download/mobile preview assumptions; combined run 27 passed/3 failed, isolated save rerun 4 passed.

## Missing

- Custom role with limited specialist coverage and versioned role/analysis/parser/report identity.
- Complete evidence-linked analysis/recommendation contract.
- Report signup/save/retrieval journey and Yes/Partly/No feedback.
- Required funnel metadata, 30+ parser fixtures, 50 manually rated role-analysis cases, live cross-user authorization proof.
- Privacy/support/retention/deletion UX and verified replay masking; reproducible gated release pipeline.

## Current blockers

P0: ISSUE-003 public privileged lead/diagnostic/AI boundaries; ISSUE-004 replay/local retention/privacy; ISSUE-005 dashboard; ISSUE-006 report continuity; ISSUE-007 truth constraints. ISSUE-002 local resume isolation is proven; hosted rollout verification and broader report/cache isolation remain release gates. See [KNOWN_ISSUES](KNOWN_ISSUES.md) for evidence and severities.

## Next recommended task

ISSUE-003: bound and authorize public privileged lead, diagnostics and AI endpoints. Do not deploy the resume migration or start the next issue without owner authorization.

## Last completed work

[2026-10-06 ISSUE-002 verification](../sessions/2026-10-06-01-issue-002-resume-rls-verification.md): local migration replay, metadata/effective grants and synthetic owner/A/B/signed-out behavior PASS; scoped issue closed. Authoritative product specification was supplied during the session and checked against the owner's explicit six-column requirements; saved-analysis/F-006 gates remain open.

[2026-10-04 ISSUE-001 closure](../sessions/2026-10-04-01-issue-001-closure.md): recorded the verified dependency-only remediation and validation; Seroval deserialization and TanStack server-function deserialization/XSS vulnerabilities resolved. No application compatibility changes required.

[2026-10-03 ISSUE-017 reconciliation](../sessions/2026-10-03-04-issue-017-reconciliation.md): retired webhook wiring removed; owner-confirmed closure evidence preserved unchanged and reflected in main. Groq model migration remains separate.

[2026-10-03 staging reconciliation](../sessions/2026-10-03-03-staging-reconciliation.md): source/generated config workflow and namespace isolation restored; build and dry-run pass. The [2026-09-30 staging deployment](../sessions/2026-09-30-01-staging-deployment-investigation.md) remains historical, not a deployment performed here.

[2026-10-03 dirty main preservation](../sessions/2026-10-03-01-preserve-dirty-main.md): classified all 96 original dirty paths; saved exact tracked/nonignored files, deletions, index, binary patches and reachable history in a private ignored local backup. Independent restore reproduced the original dirty status. No history rewrite or issue closure; see journal for recovery location and exclusions.

[2026-09-23 credential incident](../sessions/2026-09-23-01-credential-incident.md): independently confirmed two historical .env blobs across 844 reachable blobs; no credential-pattern or historical-value matches in 343 existing tracked/nonignored files, and no index pattern matches. Documented service mapping, CI replacement risks, ignore gap and owner-only closure evidence. ISSUE-017 was OPEN at that historical checkpoint; superseded by the [2026-09-27 closure](../sessions/2026-09-27-02-issue-017-closed.md).

[2026-09-22 cleanup](../sessions/2026-09-22-02-cleanup.md): removed 36 unused source files, 30 direct dependency declarations, dead checker copy and two tracked generated test outputs. Scoped lint/format ignores to avoid generated output and archived worktrees. Existing saving changes preserved.

[2026-09-22 audit](../sessions/2026-09-22-01-audit.md): specification, source, git, dependencies, data/AI/analytics, cleanup inventory, build/type/lint/unit checks and local browser verification. [Full audit entry](../../audit.md).

## Important warnings

- Historical audit began on dirty main at d84292a; that work was subsequently preserved and committed. Do not discard existing work or sibling worktree changes.
- Current production/staging builds and staging packaging dry-run passed; remote resources and runtime behavior were not reverified.
- Local resume database policies were behaviorally tested with synthetic users on 2026-10-06; no hosted applicant data or live model quality was tested. Historical credential scan evidence remains under ISSUE-017 and does not establish credential validity or absence of other secret types.
- Existing older launch/audit plans remain historical; their test counts and separate-store finding are superseded for this working tree.
- Future sessions must follow AGENTS.md continuity steps and update status, session journal, issues, roadmap/decisions when applicable.
