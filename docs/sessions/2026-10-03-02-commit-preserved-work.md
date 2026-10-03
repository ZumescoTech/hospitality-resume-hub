# Preserve and commit existing work ? 2026-10-03 / 02

Scope: preserve the owner-approved dirty work in logical commits, then fast-forward local main. No history rewrite, push, deployment or production resource changes. Started on cleanup/release-0.1 at 4b8603a (one existing commit ahead of main); that existing commit mixes cleanup and AppHeader persistence integration and was retained unchanged.

## Validation

- All 35 deleted UI modules: no remaining source references found by path/name scan; production bundle resolves successfully.
- Focused persistence/auth unit tests: 22 passed. Resume-store, loading and checker handoff regression group: 19 passed.
- Chromium mocked persistence E2E: 3 passed, 1 failed at initial account hydration (expected Cloud original). This failure was observed on the preserved implementation before commits; no product fix attempted in this preservation task.
- TypeScript: 14 errors, matching the prior documented baseline count and areas (templates, nullable auth clients, route search parameters and analytics event type). No clean-baseline checkout rerun.
- npm run build: passed.
- npm run build:staging: unavailable (missing package script).
- Wrangler 4.82.2 staging dry-run: failed resolving @tanstack/react-start/server-entry from wrangler.staging.jsonc. No generated staging build exists; staging KV identifier remains a placeholder. No fallback to a production target.
- git diff --check passed before commits; final staged checks required for each commit.
- Bounded credential-pattern scan: no matches in newly added files; one existing .env.example placeholder. This is not exhaustive secret-detection proof.
- Vexp verify_done unavailable in this session; native inspection and focused tests used.

## Preservation decisions

Keep all developer/product/audit documentation and existing implementation. Keep .claude deletions, deleted unused UI and use-mobile source, and removal of tracked Vexp metadata. Remove generated test artifacts from tracking. Ignore .vexp/ (including daily-limit.json), test-results/, playwright-report/, coverage/ (existing cleanup commit), plus .dev.vars.*, .codex local auth/session/cache/log state and *.tmp. Existing *.local preserves the private recovery archive without committing it.

Commit .codex hooks with repository-relative script path and optional PATH-based vexp-core lookup; no machine-specific extension path. Remote Codex availability/support was not tested. Preserve original Wrangler cache ID/remote-binding edits as local configuration only; no remote resource verification or production mutation.

Known validation gaps remain open; this is a preservation checkpoint, not release acceptance. ISSUE-017 provider evidence and historical credential cleanup remain separate owner-authorized work.

## File inventory relative to original main

Tracked changes (D means intentional deletion):

```text
D	.claude/CLAUDE.md
D	.claude/agents/adapter-builder.md
D	.claude/agents/fixture-writer.md
D	.claude/agents/gate-runner.md
D	.claude/agents/test-runner.md
D	.claude/hooks/vexp-guard.sh
D	.claude/settings.json
D	.claude/settings.json.vexp-bak
D	.claude/skills/verify-cv-builder-step/SKILL.md
M	.github/copilot-instructions.md
M	.gitignore
M	.prettierignore
D	.vexp/.gitattributes
D	.vexp/.gitignore
D	.vexp/manifest.json
M	AGENTS.md
M	eslint.config.js
M	package-lock.json
M	package.json
M	src/components/ui/AppHeader.tsx
D	src/components/ui/accordion.tsx
D	src/components/ui/alert.tsx
D	src/components/ui/aspect-ratio.tsx
D	src/components/ui/avatar.tsx
D	src/components/ui/badge.tsx
D	src/components/ui/breadcrumb.tsx
D	src/components/ui/calendar.tsx
D	src/components/ui/card.tsx
D	src/components/ui/carousel.tsx
D	src/components/ui/chart.tsx
D	src/components/ui/collapsible.tsx
D	src/components/ui/command.tsx
D	src/components/ui/context-menu.tsx
D	src/components/ui/dialog.tsx
D	src/components/ui/drawer.tsx
D	src/components/ui/dropdown-menu.tsx
D	src/components/ui/form.tsx
D	src/components/ui/hover-card.tsx
D	src/components/ui/input-otp.tsx
D	src/components/ui/menubar.tsx
D	src/components/ui/navigation-menu.tsx
D	src/components/ui/pagination.tsx
D	src/components/ui/popover.tsx
D	src/components/ui/progress.tsx
D	src/components/ui/radio-group.tsx
D	src/components/ui/resizable.tsx
D	src/components/ui/scroll-area.tsx
D	src/components/ui/separator.tsx
D	src/components/ui/sheet.tsx
D	src/components/ui/sidebar.tsx
D	src/components/ui/switch.tsx
D	src/components/ui/table.tsx
D	src/components/ui/tabs.tsx
D	src/components/ui/toggle-group.tsx
D	src/components/ui/toggle.tsx
D	src/hooks/use-mobile.tsx
M	src/hooks/use-user.ts
M	src/lib/cv-import-handoff.ts
M	src/lib/resume-store.ts
M	src/routes/builder.tsx
M	src/routes/tools/cruise-cv-checker.tsx
M	test-results/.last-run.json
D	test-results/debug-checker-debug-checker-flow-with-URL-logging-chromium/error-context.md
M	vite.config.ts
M	wrangler.jsonc
```

New files preserved:

```text
.codex/hooks.json
.codex/vexp-hint.sh
GET_HIRED_PRODUCT_SPEC.md
LAUNCH-REVIEW.md
audit-failures.md
audit.md
docs/project/AI_AND_ANALYTICS_AUDIT.md
docs/project/ARCHITECTURE.md
docs/project/DECISIONS.md
docs/project/DEPENDENCY_AUDIT.md
docs/project/DOCUMENTATION_AUDIT.md
docs/project/FILE_CLEANUP_AUDIT.md
docs/project/KNOWN_ISSUES.md
docs/project/PRODUCT_GAP_ANALYSIS.md
docs/project/PROJECT_OVERVIEW.md
docs/project/PROJECT_STATUS.md
docs/project/ROADMAP.md
docs/project/TECH_STACK.md
docs/sessions/2026-09-22-01-audit.md
docs/sessions/2026-09-22-02-cleanup.md
docs/sessions/2026-09-23-01-credential-incident.md
docs/sessions/2026-10-03-01-preserve-dirty-main.md
docs/sessions/SESSION_INDEX.md
docs/testing/RELEASE_CHECKLIST.md
docs/testing/TEST_STRATEGY.md
implementation-plan.md
src/components/builder/SaveNotice.tsx
src/lib/resume-persistence.ts
tests/e2e/resume-saving.spec.ts
tests/unit/resume-saving.test.tsx
tests/unit/use-user-race.test.tsx
```

The staged whitespace check identified Markdown hard breaks in the new product specification; converted trailing double spaces to equivalent backslash hard breaks, preserving rendered meaning. The E2E run regenerated tracked .last-run.json before cleanup staging; a separate follow-up cleanup commit removes it from tracking.
