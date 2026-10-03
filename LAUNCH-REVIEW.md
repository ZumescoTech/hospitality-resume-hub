# GetHired public launch review

Reviewed 7 September 2026. This is a proposed release plan, not an approved implementation scope.

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
