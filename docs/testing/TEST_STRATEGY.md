# Test strategy and audit command evidence

## ISSUE-001 update - 2026-10-04

ISSUE-001 is **PASS / CLOSED**. Owner-supplied validation: **629 passed / 13 skipped / 1 pre-existing `full_name` payload mismatch**; production build, staging build and diff whitespace check **PASS**. Remaining npm audit findings: **17 (10 high, 6 moderate, 1 low)**, unresolved and outside ISSUE-001. See [closure evidence](../sessions/2026-10-04-01-issue-001-closure.md). No commands were rerun for this documentation update; the September command ledger below remains historical.

Cleanup verification (2026-09-22): build passed after pruning unused dependencies; focused Chromium/Android preview and CTA tests 48/48 passed. Unit suite remains 629 passed / 1 failed / 13 skipped; TypeScript 14 errors; lint 24,078 findings. See [cleanup session](../sessions/2026-09-22-02-cleanup.md).

2026-09-22. Source: spec §7–13, §19–21 and §33. Tests are evidence, not feature completion by themselves.

## Existing stack and coverage

Vitest/jsdom discovers tests/unit/**/*.test.ts(x); Testing Library drives components. An integration-named checker-builder test is included in that same unit command. 63 files, 643 tests discovered. Cloudflare runtime is stubbed; most provider tests mock transport. Live Groq fixture tests are conditional and 13 tests skipped in this audit. No separate integration script or coverage percentage configured.

Playwright has Chromium, Firefox, WebKit, iPhone, Android and tablet projects, but no webServer setup. Start a safe local server manually. Current smoke suite does not actually upload/analyze in its “full happy path”: it visits checker then jumps to builder. cv-journey.spec.ts uses six named PDF fixtures and can invoke AI writing plus overwrite repository artifacts; judge-cvs.mjs sends fixture data to Groq. These were not run with real candidate documents during this audit.

| Release area | Existing evidence | Important missing evidence |
|---|---|---|
| F001 role selection/differentiation | local-engine-every-role, rubric-role-conditional, sommelierRole, public-checker-free-tier | Every dropdown role/device, custom limitations, 10 CV × 5 roles manually rated |
| F002 parsing/validation | extract-edge-cases, parse-quality-gate, parse-cv-locally, extract-prompt-classification, hybrid-extraction | 30+ actual PDF/DOCX/scanned/corrupt/column fixtures, order fidelity, OCR cancellation/partial pages |
| F003 schema/scoring | provider-schemas, adapter/router, golden/local-engine/neutral scoring, job-description guards | Final/cache validation, grounded findings, no-fabrication, malicious CV instruction matrix, whole-request deadlines |
| F004 fixes | cv-feedback, checker-audit/handoff, improvement-checklist | Evidence state/truth-qualified actions, prioritization and user actionability |
| F005 UI/recovery | component tests, smoke, local 390px report | Persisted report refresh/back/forward, genuine mobile end-to-end upload, accessibility/contrast |
| F006 auth/save | resume-saving, resume-store, use-user-race, E2E mocked saving | Actual A/B RLS CRUD, OAuth/email/signup preserves report, dashboard selection/new document |
| F007 feedback | None | Rating/comment/analysis linkage/duplicate/error tests |
| Builder/export (existing later scope) | PDF pagination/headers/labels/dates, template render, preview and CTA tests | Updated full export E2E and visual PDF review across templates/devices |

Prompt wording tests are not behavioral prompt-injection tests. Mocked ownership keys are not database authorization tests. Text fixtures do not establish PDF/DOCX parsing success.

## Commands and results

All commands ran on Windows in this repository with existing dependencies. No install, format, migration or deployment executed. Full transient logs are in the local TEMP directory under gethired-audit-*; durable summaries below contain no credentials/CV contents.

| Command | Result | Severity / interpretation / next investigation |
|---|---|---|
| npm ls --depth=0 | PASS | Installed top-level dependency graph resolved; not a clean-install proof |
| npm audit --json | FAIL advisory gate: 26 (1 critical, 11 high, 12 moderate, 2 low) | P0 seroval 1.5.2; see ISSUE-001/DEPENDENCY_AUDIT. No auto-fix |
| npm test | 62 files passed / 1 failed; 629 passed / 1 failed / 13 skipped | P1 lead webhook payload has full_name but test expects old key set; decide contract, don't just remove field to satisfy test |
| npx --no-install tsc --noEmit | FAIL, 14 errors | P1: 2 photo-shape types, 7 nullable Supabase uses, 4 required route search props, 1 undeclared cv_parse_failed event |
| npm run lint | FAIL, 47,624 findings: 47,595 errors / 29 warnings | Includes CRLF/formatting and ignored old .claude/worktrees; not 47k runtime defects. Also real conditional dashboard hooks |
| GETHIRED_LOCAL_SAVE_TEST=1; npm run build | PASS client and SSR | Synthetic client env; no production config proof. Warnings: large chunks, PDF/fontkit exports. Builder 1,616.33 kB/538.51 gzip; checker-audit 1,017.81/284.10 |
| npm run dev -- --host 127.0.0.1 | Invalid launch invocation on this npm/PowerShell combination | npm forwarded IP as root; stopped. No app defect inferred |
| GETHIRED_LOCAL_SAVE_TEST=1; node node_modules/vite/bin/vite.js dev --host 127.0.0.1 | PASS | Server local; synthetic browser Supabase and Clarity off. Runtime .env still loaded; avoid real AI/CRM |
| BASE_URL=http://127.0.0.1:5173; node node_modules/@playwright/test/cli.js test tests/e2e/resume-saving.spec.ts tests/e2e/smoke.spec.ts --project=chromium --project=android --workers=2 --output=<TEMP>/gethired-audit-playwright | 27 passed, 3 failed | Cold account editor lookup timed out; desktop smoke waits for nonexistent button name; Android smoke expects hidden preview without switching modes |
| Same CLI, tests/e2e/resume-saving.spec.ts --project=chromium --workers=1 --output=<TEMP>/gethired-audit-save-recheck | 4 passed | Isolated rerun due first-run uncertainty; original timeout retained, not erased |
| Temporary Playwright synthetic mobile checker inspection (390×844) | PASS score path; FAIL report persistence and dashboard | Role waiter, paste, free server result 56/100; no overflow/pageerror. Reload removes report. Dashboard error: No QueryClient set |
| Redacted credential pattern scan | Current nonignored text files: no matches; 786 reachable historical text blobs: 2 .env blobs matched | P0 POTENTIAL SECRET EXPOSURE, ISSUE-017; scanner heuristic and extension-limited, no validity testing |
| vexp run_pipeline / verify_done | UNAVAILABLE | No callable tools in this session; native import/reference/config searches used |

Additional focused check: `node node_modules/@playwright/test/cli.js test tests/e2e/builder-bottom-cta.spec.ts tests/e2e/preview-zoom-lightbox.spec.ts --project=chromium --project=android --workers=2 --output=<TEMP>/gethired-audit-ui-more` passed **48/48** in 2.5 minutes. These tests override viewports to 375/850/1280px and cover preview round trips, zoom, pinned controls and existing export flow; they are not physical Android testing or all-template visual PDF acceptance. Initial failed shell text searches using PowerShell wildcard paths were repeated against directory paths; no conclusion relies on an invalid search. Build artifacts were generated in ignored directories; documentation is the only maintained content changed by this audit.

## Fixture strategy

Use synthetic or explicitly consented/redacted fixtures. Preserve layout diversity: single/multi-column, tables, headings, special characters, long/short CV, links, image-only, empty/corrupt/password PDF, malformed/oversized DOCX. Store expected text/sections and warnings, not only expected scores. Do not send existing named PDF fixtures to external providers until provenance and scope are clear.

Maintain at least 30 parser fixtures with ≥95% supported success and 100% rejection of known corrupt/empty cases. Maintain 10 representative CVs × 5 supported roles = 50 analyses; humans label Relevant/Partially Relevant/Generic/Incorrect, require ≥80% Relevant and zero invented facts. Version fixtures with analysis/parser/role changes. Add negated credentials, unrelated career, keyword stuffing, “ignore instructions,” fake dates/metrics and unsupported Captain role.

## Regression requirements

For each authorized feature change, test its actual boundary and failure recovery; run existing full unit/type/lint/build checks before release. Add high-value integration tests for parse→quality gate, role→report, cache→schema, report→signup/save, feedback→analysis. Add database tests using A/B/anonymous actors for read/write/delete/reassignment. Mock provider errors/invalid JSON in local tests; use a separate deliberate live semantic evaluation.

Repair E2E assertions to match current controls without weakening the expected user outcome. Test real upload→report→save on desktop and mobile, plus malformed upload, parse/model failure and auth failure preserving progress. Test storage quota, offline/failed cloud, cross-tab conflicts, signout/account switch and dirty draft recovery. No real-user launch until privacy, ownership and trust gates are met.
