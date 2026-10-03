# GetHired audit

Cleanup follow-up: [2026-09-22 unused-code cleanup](docs/sessions/2026-09-22-02-cleanup.md) removed 36 unused source files, 30 direct dependencies and two generated test outputs. The audit snapshot below is historical; release blockers remain open.


## Current repository audit — 2026-09-22

This section and linked project documents supersede earlier status/test counts below. Earlier audit text is retained as history. Source of truth: [GET_HIRED_PRODUCT_SPEC.md](GET_HIRED_PRODUCT_SPEC.md).

**Readiness: NOT READY.** The existing product is a deterministic cruise-role CV checker with a substantial builder/template/PDF suite. It is not yet the complete Release 0.1 analysis/save/feedback product. No rewrite is recommended.

**Immediate security finding: POTENTIAL SECRET EXPOSURE.** Two historical .env blobs contain credential-shaped values including a SUPABASE_SERVICE_ROLE_KEY label. Removal commits confirm accidental commitment; revocation is unknown. See ISSUE-017; values are not reproduced. Locked seroval 1.5.2 also has a critical advisory and is used in TanStack server-function deserialization. These precede feature work.

### Verified results

- Existing npm dependency graph resolves; no dependencies installed or modified.
- Build passes in existing synthetic-client test mode. Unit tests: 629 pass, 1 fails, 13 skipped (63 files).
- Typecheck: 14 errors. Lint: 47,624 findings, including formatting and old worktrees; not all functional bugs.
- Desktop/Android saving+smoke subset: 27 pass, 3 fail; isolated save rerun 4/4 passes. Two smoke failures have stale download/preview assumptions. Focused preview/CTA suite: 48/48 passes.
- Synthetic mobile role→paste→free score works with no overflow; report disappears on refresh. /dashboard shows No QueryClient set.
- npm audit: 26 affected packages, including one critical; historical pattern scan: 786 blobs inspected, two .env versions matched. Current nonignored text scan found no credential match. Validity/revocation not tested.

### What exists and what remains

Role selection, PDF/DOCX/TXT parser code, optional OCR/paste, deterministic scoring, two top fixes, breakdown, optional WhatsApp capture, checker→builder handoff, seven templates, local/cloud CV saving code and AI builder assistance exist. The new persistence controller was already uncommitted before this audit and should be preserved.

F001: no custom/limited role flow or profile versions. F002: no versioned validated parse contract or verified 30-file matrix. F003: generic free explanations, incomplete evidence schema/cache validation/truth tests. F004: unsafe unqualified “add keyword” guidance. F005: no durable report and incomplete score explanation/measurement. F006: broken dashboard and no original-report saving across signup. F007: usefulness feedback absent.

### Main technical/product risks

Historical credentials; vulnerable serializer; unknown resumes RLS; public privileged lead updates and diagnostics; unbounded AI-capable RPCs; replay/retention uncertainty; dashboard crash/report loss; weak evidence/truth constraints; incomplete parser deadlines/fixtures; ungated CI and failing checks. Marketing ATS/job-alert/account claims exceed verified behavior. WhatsApp interrupts detailed report access. Broader builder functionality should remain but not expand current scope.

### Cleanup snapshot

376 existing files classified: KEEP 234; KEEP — DOCUMENT 45; REFACTOR LATER 12; ARCHIVE CANDIDATE 12; DELETE CANDIDATE 31; GENERATED 38; UNKNOWN 4. Per-file references and recommendations are in the ledger. No files deleted. Root termbank inputs, PDF test fixtures, all registered templates, AI builder dependencies and the Cloudflare browser-build test stub must remain.

### Documentation map

- [Project overview](docs/project/PROJECT_OVERVIEW.md), [current status](docs/project/PROJECT_STATUS.md), [stack/env](docs/project/TECH_STACK.md), [architecture/data/journey](docs/project/ARCHITECTURE.md).
- [F001–F007 gaps and engineering coverage](docs/project/PRODUCT_GAP_ANALYSIS.md), [AI/analytics audit](docs/project/AI_AND_ANALYTICS_AUDIT.md), [dependencies](docs/project/DEPENDENCY_AUDIT.md).
- [Known issues P0/P1/P2](docs/project/KNOWN_ISSUES.md), [roadmap/next five tasks](docs/project/ROADMAP.md), [decisions](docs/project/DECISIONS.md).
- [Per-file cleanup](docs/project/FILE_CLEANUP_AUDIT.md), [documentation/git review](docs/project/DOCUMENTATION_AUDIT.md), [tests](docs/testing/TEST_STRATEGY.md), [release checklist](docs/testing/RELEASE_CHECKLIST.md).
- [Session index](docs/sessions/SESSION_INDEX.md), [audit journal](docs/sessions/2026-09-22-01-audit.md).

**Immediate next session:** contain historical credential exposure and document revocation/rotation evidence, without logging values or blindly rewriting history. Then remediate the serializer, prove authorization/privacy, restore report/account continuity, harden F001–F005, and finish save/feedback plus launch regression. This audit did not implement these changes.

## Historical audit below — do not use as current status

Reviewed 7 September 2026. This is the main record for findings, outstanding tasks, what worked, what failed and verification blockers. Update this file as work progresses; mark a task complete only after its acceptance checks pass. Implementation tasks below are proposed and have not been completed by this audit.

## What worked

- Source inspection established the existing feature inventory and identified concrete launch issues.
- Production compilation completed successfully and generated client and server artifacts, with warnings documented below.
- 607 automated tests passed across the suite. This is evidence for the tested cases, not confirmation that every user journey works in production.
- The checker-to-builder handoff, improvement checklist, specialised role guidance and mobile preview controls are implemented in source and provide a foundation for a focused launch.

## What failed or remains blocked

- One automated test failed: the lead webhook payload now includes `full_name`, contrary to the test's expected field set. Decide the intended data contract before changing implementation or expectations.
- TypeScript reported 17 errors.
- Lint failed and includes archived worktrees, making its current results noisy.
- Saving has code-level correctness problems: independent store instances, unchecked cloud errors and inaccurate save status.
- Dashboard Edit/New CV links do not implement the advertised document selection/creation flows.
- Lead capture can report success without confirmed persistence.
- Local runtime startup failed because the Cloudflare remote proxy could not refresh authentication, even after the permitted elevated retry.
- Browser control returned a session error. Visual quality, keyboard accessibility, real-device behaviour and the complete import-to-download journey were not verified.
- Production database policies, provider configuration, edge abuse controls and analytics settings remain unverified; source omissions do not prove production settings are absent.

## Task tracker

All tasks are open. P0 tasks precede broad release; P1 tasks improve the launch experience. Acceptance checks are requirements for future verification, not completed results.

| ID | Priority | Task | Acceptance check |
|---|---|---|---|
| A01 | P0 | Share one resume store between builder and header; handle cloud errors and retain local recovery data. | Edits survive reload; interrupted saves do not lose work; header status tracks the edited CV and reports failures accurately. |
| A02 | P0 | Finish selected-CV editing and new-CV creation, or explicitly defer accounts for launch; fix dashboard hook ordering. | Each Edit opens the selected document; New CV preserves existing documents; sign-in/out does not mix drafts or crash. |
| A03 | P0 | Add privacy, terms, support and clear-draft/deletion paths with accurate data-processing explanations. | Pages are reachable; storage, AI processing and lead destinations are explained; deletion/support paths work. |
| A04 | P0 | Verify deployed database ownership policies and analytics masking/consent configuration. | Two test users cannot access each other's CVs; anonymous access is appropriately restricted; rendered personal data is masked. |
| A05 | P0 | Add or verify request bounds, quotas and abuse controls; enforce AI tier eligibility server-side; restrict metrics. | Oversized/excess requests are rejected; changing a client tier cannot unlock protected processing; non-staff cannot read internal metrics. |
| A06 | P0 | Resolve lead data contract and truthful submission status. | Payload test matches the intended disclosed fields; failed persistence offers retry/skip instead of a success claim. |
| A07 | P0 | Fix 17 TypeScript errors and scope lint to maintained project files. | Type checking and appropriately scoped lint pass; the full unit suite passes with skipped coverage explicitly understood. |
| A08 | P0 | Restore runtime test access and complete desktop/mobile import, save, edit, preview and export checks. | The journey works on target browsers/devices; all seven template PDFs are readable without clipping or missing content. |
| A09 | P0 | Correct account/free-access copy, ATS claims, job-alert promises and production social URLs. | Public copy matches verified behaviour and the actual service provided. |
| A10 | P1 | Provide clear import/start-blank choices and one recommended template. | A new user can identify the next action without reviewing every template. |
| A11 | P1 | Refine the existing checklist to three priority fixes and role-appropriate examples. | Fixes open the right fields and remain relevant across service, housekeeping, reception and culinary roles. |
| A12 | P1 | Add a final pre-export review and associate field labels/errors with their controls. | Missing essentials and incomplete entries are actionable; controls have accessible names and linked error descriptions. |
| A13 | P1 | Defer heavy PDF/import code where practical and measure mobile performance. | Record before/after payload and device/network measurements without regressing export or import. |
| A14 | P1 | Observe 5-10 target applicants using the completed journey on their phones. | Record completion, abandonment and assistance needed; proposed target is at least 8 of 10 completing without help. |

## Audit change log

- 7 September 2026: completed source review and available automated checks; recorded runtime blockers. No application fixes made.
- 7 September 2026: consolidated the findings and proposed tasks into `audit.md` at the user's request. Use this file for subsequent audit updates; `LAUNCH-REVIEW.md` is the earlier snapshot.

## Assessment

The app has enough features for a focused first release. Resolve persistence, privacy, public endpoint protection, and quality-check failures before broad promotion. Position around helping cruise and hospitality applicants turn existing experience into a clear, role-relevant CV.

## Current features found in source

- Cruise-role CV checker with score, breakdown, keywords, prioritised feedback and optional job description.
- PDF/DOCX import, scanned-PDF OCR fallback, paste fallback and progress feedback.
- Checker-to-builder import with an improvement checklist that opens relevant sections.
- Six builder sections: personal, experience, education, skills, certifications and hospitality.
- Hospitality-specific details, target-role selection, writing assistance and suggested phrasing.
- Seven templates: Vintage, Winelands, Noir, Executive, Harbour, Admiral and Steward.
- Colour/formatting controls, photo support, desktop live preview, mobile edit/preview modes and zoom.
- Browser draft storage, cloud-save code, sign-in/sign-up and a CV dashboard.
- PDF generation/download, optional WhatsApp lead capture and internal metrics.

Presence in source does not establish production readiness. Account flows, deployed database policies, AI provider configuration and live export were not verified.

## Before public release, in priority order

1. **Make saving reliable.** `src/components/ui/AppHeader.tsx:5` creates a separate `useResumeStore()` instance from the builder. The hook uses component-local state, so the status indicator does not track the active edits and performs its own hydration/save effects. Share one store. In `src/lib/resume-store.ts`, inspect Supabase returned errors, preserve a local recovery copy, expose saving/saved/failed states and handle auth transitions. Test reload, failed network and navigation during the debounce.
2. **Finish or defer accounts.** Dashboard Edit links at `src/routes/dashboard.tsx:232` point to the homepage, and New CV does too. The store always loads the latest CV, not a selected ID. Implement selection/new-document semantics, ownership checks and recovery, or offer a clearly described single browser draft for the first release. Fix hooks after the dashboard's conditional return.
3. **Make data handling explicit.** No privacy/terms/support routes were found. Explain browser storage, cloud storage, AI processing and lead recipients. Add clear-draft and deletion/support paths. Verify live RLS on the resumes table; its definition is absent from the checked-in migration. The lead migration enables RLS, but production policies were not inspected. Confirm Clarity masking of rendered previews and consent handling if enabled.
4. **Protect public server functions.** No application-level request throttling or bot checks were found in source. Add server-side input bounds, quotas and abuse protection for AI and lead endpoints; verify any existing edge protection. The checker accepts a caller-supplied free/paid tier and defaults to paid: enforce eligibility server-side or expose only the intended free path. Restrict internal metrics to staff.
5. **Restore trustworthy checks.** Resolve the failing lead-payload contract deliberately, fix TypeScript errors and scope lint away from archived worktrees. Then run the real desktop/mobile import-to-export journey and inspect exported PDFs across all templates.
6. **Correct product promises.** Homepage FAQ says an account unlocks the builder, while anonymous building is implemented. Explain the actual free experience consistently. Replace categorical ATS rejection claims with an honest description of this app's own readiness rubric. Check production social URLs. Lead capture currently can report success even when persistence fails; provide truthful retry/skip feedback and only promise job alerts if the delivery process exists.

## Small changes that improve simplicity and usefulness

- Two obvious entry choices: Improve my existing CV / Start a new CV.
- Recommend one template based on role; keep the other six under Change style.
- Refine the existing checklist to the three highest-impact fixes, with plain-language examples and direct links to fields.
- Adapt examples and optional hospitality fields to the chosen role; wine/service terminology should not dominate unrelated jobs.
- Add a final review before export for missing contact details, incomplete entries, dates and actual PDF page count. Make warnings actionable without inventing experience or certifications.
- Link labels to inputs and error messages; the shared Field component currently omits label association.
- Reduce the builder's initial download cost by loading PDF/import dependencies when needed, then measure on a slower mobile connection.
- Keep WhatsApp optional and secondary to completing the CV.

Defer additional templates, payments, job boards, cover letters, interview tools and application tracking until the core journey is reliable and observed with real applicants.

## Verification evidence

- `npm test -- --reporter=dot`: 607 passed, 1 failed, 13 skipped across 61 files. Failure: checker-score-regression expects a lead webhook payload without the newly included full_name property.
- `npm run build`: exit 0; client and server artifacts generated. Warnings include large chunks, PDF fontkit exports and restricted Wrangler log-file access. Builder client chunk: approximately 1.605 MB minified / 535 KB gzip, excluding other chunks/assets. This is a payload observation, not a measured load-time result.
- `npx tsc --noEmit`: 17 reported TypeScript errors, including nullable Supabase clients, template photo shapes, colour types, route search props and an undeclared analytics event.
- `npm run lint`: failed with 47,815 findings, mostly formatting; scans old `.claude/worktrees` content, so this total is not the current app's functional defect count.
- Runtime review blocked: the configured Cloudflare remote development proxy could not refresh authentication (HTTP 400) after elevated retry. Browser control also returned a session error. No completed browser, accessibility, mobile or end-to-end pass is claimed.
- Vexp pipeline returned limited pivots, skeleton extraction returned no data and verify_done returned Unknown tool. Source inspection and direct project checks supplied the evidence above.

## Proposed launch gate

After fixes, observe 5-10 target applicants completing a CV on their own phones. Aim for at least 8 of 10 to finish without assistance; treat that as a proposed target, not a measured result. Validate save/reload, import fidelity and readable PDFs before promoting broadly. Track successful exports and where people abandon the journey.

## Reference documentation checked

- Supabase row-level security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Clarity masking: https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-masking
- Clarity FAQ/consent: https://learn.microsoft.com/clarity/faq/
