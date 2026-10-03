# ISSUE-017 reconciliation ? 2026-10-03 / 04

## Scope and evidence

Owner authorized reconciliation of main with the already-closed ISSUE-017 record, using 6a01692 / 605a473 as references only. Applied the selected security hunks rather than cherry-picking the mixed security/model-migration commit. Groq model migration remains on the sibling branch and is outside this task. No ISSUE-001 implementation, push, deployment, provider operation, credential inspection or history rewrite.

Preserved 2026-09-27-01-issue-017-closure-check.md and 2026-09-27-02-issue-017-closed.md byte-for-byte from 605a473. Their chronology and original branch/integration statements remain historical. The owner confirmation covers credential replacement and access review with no suspicious activity; this session does not independently verify remote credential state. No secret values were displayed or tested.

## Selected changes

- Removed retired Google Sheets fallback from both source notification paths, environment example and CI secret provisioning; generic LEAD_NOTIFY_WEBHOOK_URL remains.
- Updated the existing root CLAUDE.md data summary (no .claude directory restored).
- Updated Operations guidance to remove retired setup and point to the outstanding operator-only remote-secret cleanup.
- Reconciled only the ISSUE-017 section from the reference issue record, retaining newer unrelated issue content; marked CLOSED in PROJECT_STATUS and updated ROADMAP to avoid obsolete containment instructions. ISSUE-001 remains unstarted.
- Preserved historical incident evidence and indexed the recovered journals. .dev.vars.* ignore coverage was already present.

## Validation and limits

Shared reconciliation validation: 57 relevant tests passed; one pre-existing full_name webhook payload contract failure remains (ISSUE-009/010). All selected persistence/auth tests pass. TypeScript retains the same 14 baseline errors under ISSUE-010; dashboard area overlaps ISSUE-005. Earlier E2E account input timeout remains unresolved and was not rerun. No unrelated fixes made.

Both production and staging builds pass; generated staging config assertions and Wrangler dry-run pass. See the staging reconciliation journal. Source/example/workflow checks prove the retired variable is absent, both generic notification paths remain, and existing .env/.dev.vars plus staging-secret ignore coverage is preserved. Closure journals compare byte-for-byte with reference commits. Final diff and whitespace checks performed before commit. Vexp verify_done unavailable.

ISSUE-017 is CLOSED based on recorded owner confirmation and repository remediation, not a new live security audit. Remote Worker secret removal remains an operator follow-up; no remote command was run. Supabase changelog retrieval was unavailable; no Supabase API/schema behavior was changed or queried.

## History rewrite boundary

The staging/closure inconsistencies are reconciled, but no history rewrite is authorized or performed. A later rewrite must preserve or explicitly account for the dirty sibling worktree, unmerged model migration, agent checkpoint refs, other branches/worktrees, and private backup bundles containing historical objects. These retained copies were not sanitized here. Clean main and incident closure do not establish a safe all-ref rewrite plan or release readiness.
