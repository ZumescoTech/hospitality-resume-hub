# Development session - 2026-10-03 / 01

## Task and exit criteria

Owner requested classification and preservation of dirty main before any Git history rewrite. This is a preservation/documentation task, not authorization to rewrite history or implement another issue. Exit criteria: classify every dirty path, preserve exact file bytes and deletions plus Git/index state, demonstrate recovery independently, and leave pre-existing work unchanged.

## Baseline and scope

Branch `main`, HEAD `d84292a46c8782c566f38f5e44dacf00d0640294`; index empty of staged changes. Initial state: 18 modified tracked files, 47 tracked deletions, 31 untracked files (96 dirty paths). There are 360 tracked paths. Preserve unresolved tooling deletions and runtime configuration without assuming they are approved cleanup.

## Preservation evidence

Backup directory: `.gethired-main-preservation-20261003-084312.local/` in the repository root, ignored by the existing `*.local` rule. No ignore changes were needed.

- `worktree.zip`: exact bytes of 356 existing files, including all existing tracked/nonignored files and 12 ignored local files (configuration and test/log evidence).
- `manifest.json`: SHA-256/size for each saved file, all 47 tracked deletion records, and explicit excluded-file inventory.
- `history.bundle`: all reachable Git refs/history, verified with `git bundle verify`.
- `index.raw`, `staged.patch`, `unstaged.patch`, `status-before.bin`: original index, binary/full-index diffs and exact expanded Git status.
- `checksums.json`: integrity hashes for the original backup artifacts.
- `RECOVERY.md`: recovery procedure and boundaries.

Excluded 27,835 ignored generated dependency/build/runtime files under node_modules, dist, .tanstack, .wrangler and .vexp. This is not a disk image or a backup of other worktrees, reflog-only/unreachable objects, Git hooks/config or remote provider settings. Other registered worktrees were not modified. The bundle includes reachable branches, not those worktrees' dirty files.

The archive contains private local configuration and historical credential-bearing Git data. Keep it local/private; do not commit or upload it. A temporary verification copy also exists under the OS temporary directory. History cleanup, if later authorized, must explicitly account for these retained copies. No credentials were displayed or tested.

## Classification

The following inventory covers every original dirty path. Classification is for preservation and later review, not approval to commit or discard. Saving files form one coherent dependency group. Cleanup provenance comes from the 2026-09-22 journal. Wrangler changes the cache namespace and enables remote KV; its purpose/approval is not established by this task and it must be reviewed separately. Tooling removals similarly remain unverified.

### Agent instructions and local tooling - preserve; provenance not fully established (17)

- ` D` `.claude/CLAUDE.md`
- ` D` `.claude/agents/adapter-builder.md`
- ` D` `.claude/agents/fixture-writer.md`
- ` D` `.claude/agents/gate-runner.md`
- ` D` `.claude/agents/test-runner.md`
- ` D` `.claude/hooks/vexp-guard.sh`
- ` D` `.claude/settings.json`
- ` D` `.claude/settings.json.vexp-bak`
- ` D` `.claude/skills/verify-cv-builder-step/SKILL.md`
- ` M` `.github/copilot-instructions.md`
- ` M` `.vexp/.gitattributes`
- ` M` `.vexp/.gitignore`
- ` M` `.vexp/manifest.json`
- ` M` `AGENTS.md`
- `??` `.codex/hooks.json`
- `??` `.codex/vexp-hint.sh`
- `??` `.vexp/daily-limit.json`

### Unused-code and dependency cleanup - documented 2026-09-22 (42)

- ` M` `.gitignore`
- ` M` `.prettierignore`
- ` M` `eslint.config.js`
- ` M` `package-lock.json`
- ` M` `package.json`
- ` D` `src/components/ui/accordion.tsx`
- ` D` `src/components/ui/alert.tsx`
- ` D` `src/components/ui/aspect-ratio.tsx`
- ` D` `src/components/ui/avatar.tsx`
- ` D` `src/components/ui/badge.tsx`
- ` D` `src/components/ui/breadcrumb.tsx`
- ` D` `src/components/ui/calendar.tsx`
- ` D` `src/components/ui/card.tsx`
- ` D` `src/components/ui/carousel.tsx`
- ` D` `src/components/ui/chart.tsx`
- ` D` `src/components/ui/collapsible.tsx`
- ` D` `src/components/ui/command.tsx`
- ` D` `src/components/ui/context-menu.tsx`
- ` D` `src/components/ui/dialog.tsx`
- ` D` `src/components/ui/drawer.tsx`
- ` D` `src/components/ui/dropdown-menu.tsx`
- ` D` `src/components/ui/form.tsx`
- ` D` `src/components/ui/hover-card.tsx`
- ` D` `src/components/ui/input-otp.tsx`
- ` D` `src/components/ui/menubar.tsx`
- ` D` `src/components/ui/navigation-menu.tsx`
- ` D` `src/components/ui/pagination.tsx`
- ` D` `src/components/ui/popover.tsx`
- ` D` `src/components/ui/progress.tsx`
- ` D` `src/components/ui/radio-group.tsx`
- ` D` `src/components/ui/resizable.tsx`
- ` D` `src/components/ui/scroll-area.tsx`
- ` D` `src/components/ui/separator.tsx`
- ` D` `src/components/ui/sheet.tsx`
- ` D` `src/components/ui/sidebar.tsx`
- ` D` `src/components/ui/switch.tsx`
- ` D` `src/components/ui/table.tsx`
- ` D` `src/components/ui/tabs.tsx`
- ` D` `src/components/ui/toggle-group.tsx`
- ` D` `src/components/ui/toggle.tsx`
- ` D` `src/hooks/use-mobile.tsx`
- ` M` `src/routes/tools/cruise-cv-checker.tsx`

### CV persistence, auth race protection and synthetic save testing - preserve together (11)

- ` M` `src/components/ui/AppHeader.tsx`
- ` M` `src/hooks/use-user.ts`
- ` M` `src/lib/cv-import-handoff.ts`
- ` M` `src/lib/resume-store.ts`
- ` M` `src/routes/builder.tsx`
- ` M` `vite.config.ts`
- `??` `src/components/builder/SaveNotice.tsx`
- `??` `src/lib/resume-persistence.ts`
- `??` `tests/e2e/resume-saving.spec.ts`
- `??` `tests/unit/resume-saving.test.tsx`
- `??` `tests/unit/use-user-race.test.tsx`

### Generated test-output deletions - documented cleanup (2)

- ` D` `test-results/.last-run.json`
- ` D` `test-results/debug-checker-debug-checker-flow-with-URL-logging-chromium/error-context.md`

### Runtime configuration - separate review required (1)

- ` M` `wrangler.jsonc`

### Product authority, audits and continuity documentation - preserve (23)

- `??` `GET_HIRED_PRODUCT_SPEC.md`
- `??` `LAUNCH-REVIEW.md`
- `??` `audit-failures.md`
- `??` `audit.md`
- `??` `docs/project/AI_AND_ANALYTICS_AUDIT.md`
- `??` `docs/project/ARCHITECTURE.md`
- `??` `docs/project/DECISIONS.md`
- `??` `docs/project/DEPENDENCY_AUDIT.md`
- `??` `docs/project/DOCUMENTATION_AUDIT.md`
- `??` `docs/project/FILE_CLEANUP_AUDIT.md`
- `??` `docs/project/KNOWN_ISSUES.md`
- `??` `docs/project/PRODUCT_GAP_ANALYSIS.md`
- `??` `docs/project/PROJECT_OVERVIEW.md`
- `??` `docs/project/PROJECT_STATUS.md`
- `??` `docs/project/ROADMAP.md`
- `??` `docs/project/TECH_STACK.md`
- `??` `docs/sessions/2026-09-22-01-audit.md`
- `??` `docs/sessions/2026-09-22-02-cleanup.md`
- `??` `docs/sessions/2026-09-23-01-credential-incident.md`
- `??` `docs/sessions/SESSION_INDEX.md`
- `??` `docs/testing/RELEASE_CHECKLIST.md`
- `??` `docs/testing/TEST_STRATEGY.md`
- `??` `implementation-plan.md`

## Verification and outcome

PASS: archive CRC and all saved-file SHA-256 checks; live bytes/deletions unchanged after capture; original Git status unchanged; bundle verification; independent no-checkout clone from bundle, restoration of raw index and ZIP files reproduced the exact initial expanded Git status. Final verification permits only this journal, SESSION_INDEX.md and PROJECT_STATUS.md changes; all other initial files/deletions and index/HEAD must remain unchanged. Final continuity files are also copied to the backup separately.

No product tests were run: application behavior was not changed. Historical baseline only: unit 629 passed / 1 failed / 13 skipped, 14 TypeScript errors, 24,078 lint findings; these were not rerun or resolved. vexp run_pipeline/verify_done are unavailable; native Git and byte-level verification used. No application code, staging, commits, stash, reset, history rewrite, deployment, live data or provider changes.

Preservation task complete; Release 0.1 remains NOT READY and ISSUE-017 remains OPEN. ROADMAP, KNOWN_ISSUES and DECISIONS do not change because no issue state, work order or architecture decision changed.

Exact next roadmap task: continue ISSUE-017 containment: add/verify .dev.vars.* ignore coverage while retaining current ignore edits; obtain provider invalidation and consumer-replacement evidence and resolve webhook exposure. A separate owner decision after invalidation is still required before history cleanup. Do not start that implementation within this session.
