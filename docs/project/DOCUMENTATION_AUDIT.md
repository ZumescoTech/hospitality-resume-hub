# Documentation and history audit

2026-09-22. Active authority is GET_HIRED_PRODUCT_SPEC.md; current implementation/status lives in docs/project. Keep historical documents, but do not execute their plans automatically.

| Document/group | Purpose and accuracy | Disposition |
|---|---|---|
| GET_HIRED_PRODUCT_SPEC.md | Current Release 0.1 authority, internally calls itself PRODUCT_SPEC.md; newly untracked at start | KEEP; link actual filename; no duplicate spec |
| AGENTS.md | vexp rules; tool unavailable this session | KEEP; append mandatory continuity without replacing pre-existing edits |
| CLAUDE.md / .claude/CLAUDE.md | Agent guidance and older product/stack assumptions | KEEP — DOCUMENT; reconcile with current spec, not independent release authority |
| .github/copilot-instructions.md | Tool context rules, dirty at start | KEEP — DOCUMENT; no unrelated edits |
| .claude/agents/*.md and skills/verify-cv-builder-step | Historical assistant roles and builder verification workflow | KEEP — DOCUMENT; not auto-invoked by audit |
| audit.md | Existing audit/task tracker; prior counts/findings stale after saving work | Preserve history, add current audit entry and links rather than duplicate executive report |
| audit-failures.md | Prior audit failures and runtime blockers | ARCHIVE CANDIDATE; local server/browser now runnable in safe mode; current results in TEST_STRATEGY |
| LAUNCH-REVIEW.md | September 7 proposed builder-oriented launch review | ARCHIVE CANDIDATE; separate store issue partly addressed by dirty changes; not current 0.1 completion |
| implementation-plan.md | Plans based on A01–A14 older audit | ARCHIVE CANDIDATE; map unresolved items to KNOWN_ISSUES; not active authorization |
| OPERATIONS.md | Worker deploy/rollback and isolated CRM runbook | KEEP — DOCUMENT; staging placeholder and build/runtime env distinctions need correction |
| EXECUTION.md / files/EXECUTION.md | Earlier agent execution waves; byte-identical duplicates | ARCHIVE CANDIDATE; keep one historical authority only in future cleanup; not current session instructions |
| files/gethired-execution-kit.zip | Packaged historical execution material | ARCHIVE CANDIDATE; do not extract over working tree |
| gethired-build-scope.yaml | Earlier task packets/flags/security prerequisites | ARCHIVE CANDIDATE; some implemented, some experimental; current spec takes precedence |
| packet-b-scoring-accuracy.md | Sommelier fixture/rubric/calibration history | ARCHIVE CANDIDATE; retain rationale; no proof current 50-case launch matrix passed |
| bug-fix.md | Earlier QA remediation queue | ARCHIVE CANDIDATE; several fixes exist; do not treat all listed bugs as current |
| gethired-resilience-test-plan.md | Fault injection and telemetry reference | KEEP — DOCUMENT; useful test ideas but includes photo/future scope; tests determine actual coverage |
| NOTES.md | Deferred parser/copy/preview-stickiness observations | ARCHIVE CANDIDATE; historical measurements not rerun; sticky issue remains UNKNOWN current runtime |
| log.md | Past require/hydration incidents and safe module imports | ARCHIVE CANDIDATE; useful rationale, not present failure proof |
| tests/fixtures/**/*.md and .txt | Synthetic/scoring fixtures rather than docs | KEEP; test data, do not merge into prose docs |
| test-results/**/error-context.md | Generated prior failure snapshots | GENERATED; not current status authority; retention review |
| CV PDFs / spreadsheet | Reference/test assets, possibly personal information | Keep dependency fixtures; unknown standalone reference provenance needs owner review |

## Git/source-control findings

Branch main, HEAD d84292a. Recent history: d84292a isolated CRM tracking; bb5c1f9 phone capture/name persistence; 5818727 CRM isolation; 78b5712 checker→builder handoff; 36ba1e0 public free checker; ab3ddc2 Cloudflare client stub; 2aaddc7 local scorer. Older deletions include removal of free templates, replacement of bottom navigation and new style drawer. These support retaining current premium-named templates despite earlier “free” test names; do not resurrect deleted UI.

Starting working tree already changed AppHeader, use-user, cv-import-handoff, resume-store, builder and vite.config; new SaveNotice, resume-persistence and saving tests existed. Tooling config/hooks and several root audit/spec docs were also dirty/untracked. Preserve them. This audit did not commit, stage, reset or revert them.

.gitignore correctly ignores .env/.env.*, except example, node_modules, dist and .wrangler/.dev.vars. But Git history still contains credential-bearing .env versions (ISSUE-017). Ignore rules do not revoke credentials or remove history. test-results and cv-journey-artifacts are tracked/generated; review baseline value and PII before excluding. Old ignored .claude/worktrees enter lint; add appropriate lint exclusions in a later scoped change. .vexp metadata/settings backups should be reviewed for appropriate tracking. Keep lockfile tracked.

No purpose is inferred for unknown standalone reference assets: PURPOSE UNKNOWN — REQUIRES OWNER REVIEW. Documented historical intent comes from source/comments/commits, not assumptions about prior conversations.
