# GetHired public-release implementation plan

Prepared from [audit.md](audit.md) and [audit-failures.md](audit-failures.md), 7 September 2026.

**Status: proposed implementation; all work and acceptance tests below are pending.** This document defines changes and the evidence required to accept them. It does not claim that fixes or tests have been completed. `audit.md` remains the ongoing findings and results record.

## Outcome and scope

A hospitality applicant can import a CV or start blank, improve relevant content, save reliably, and download a readable PDF without assistance. Existing drafts must remain recoverable. Public-facing promises must match working functionality.

Keep the existing checker, builder and seven templates. Defer payments, additional templates, job boards and unrelated career tools. Do not expand scope merely to silence a warning or increase a score.

## Delivery order

| Sequence | Plan | Audit tasks | Dependency / release importance |
|---|---|---|---|
| 1 | Reliable saving | A01 | Highest product priority; begin with reproducible regression tests. |
| Alongside 1 | Restore audit/test environment | A08, tooling blockers | Needed before accepting any browser-dependent fix. |
| 2 | Correct account and document flows | A02 | Builds on shared saving; production acceptance also requires access-control tests. |
| 3 | Restore automated checks and reliable lead capture | A06, A07 | Establish useful checks early and keep them passing throughout later work. |
| 4 | Protect stored data and public endpoints | A04, A05 | Must pass before broad public exposure. |
| 5 | Privacy, support and accurate product copy | A03, A04, A09 | Must reflect the final account, analytics and lead behaviour. |
| 6 | Complete the CV journey and PDF/accessibility checks | A08, A12 | Final functional release gate after earlier changes. |
| 7 | Simplify the experience and improve loading | A10, A11, A13 | Preserve the verified core journey; recheck affected behaviour. |
| 8 | Applicant pilot and release decision | A14 | Run against the release candidate, after technical blockers are closed. |

For each plan: reproduce the problem, make a focused change, run the relevant acceptance tests, and record evidence in `audit.md`. Do not mark a task complete merely because code compiles.

## Plan 1 — Reliable saving

### What needs to be done

- Replace the independent builder/header store instances with one shared state owner. A provider with a read-only status consumer is sufficient; avoid introducing another state library unless needed.
- Update `src/lib/resume-store.ts`, `src/components/ui/AppHeader.tsx` and `src/routes/builder.tsx` so the header observes the same document and save operation as the editor.
- Separate document hydration, local recovery persistence and cloud synchronisation. Do not save empty initial state before hydration finishes.
- Validate stored draft structure and preserve recoverable data when parsing or migration fails. Offer recovery/reset rather than silently claiming success.
- Check both returned Supabase errors and thrown exceptions. Keep edits after failure and provide an explicit retry action.
- Track edited and acknowledged document revisions. Serialise or otherwise coordinate writes so an older response cannot mark newer edits saved or overwrite them.
- Save recovery data promptly, independently of the cloud debounce. Scope account recovery drafts by user and document; treat anonymous drafts separately.
- On sign-out/account changes, cancel pending writes where possible and ignore stale responses. Clear the previous user's in-memory state before presenting another account's data.
- Detect another tab modifying the same draft and warn or offer recovery; do not silently overwrite conflicting versions.

### What good implementation looks like

The header accurately distinguishes loading, unsaved changes, saved on this device, saving to cloud and saved to cloud. “Saved to cloud” means the latest revision was acknowledged, not merely that a timer finished. If local storage fails, the app does not claim a device save. A cloud error keeps the editable draft and explains how to retry.

Reloading or navigating away during a cloud debounce does not discard a locally recoverable draft. Recovery does not depend on an unreliable network request during page unload.

### Tests that prove it worked

| Test | Method | Required result |
|---|---|---|
| Header follows edits | Render the real shared provider with builder/status consumers; edit a field. | Both observe the same revision; the header cannot stay “Saved to cloud” while newer changes are pending. |
| Draft survives immediate reload | Browser: edit and reload before the cloud debounce expires. | Latest locally persisted changes are restored. |
| Returned and thrown save failures | Integration: make Supabase return an error, then throw a network error. | Both show failure/retry, preserve data and never announce cloud success. |
| Slow/out-of-order work | Delay hydration/save responses; edit again while a save is pending. | Older work cannot replace newer content or falsely mark it saved. |
| Storage unavailable | Simulate quota failure, inaccessible storage and malformed saved JSON. | No crash or false saved claim; clear recovery/error feedback appears. |
| Account switch | Sign out during a pending save and sign in as a different test user. | No previous-user data appears or saves into the new account. |
| Two tabs | Open one draft in two tabs and edit both. | Conflict is detected or safely reconciled; no silent loss of the newer draft. |

**Done when:** the above tests pass for anonymous and account-backed drafts, and failure/retry behaviour is recorded. Audit task A01.

## Plan 2 — Restore the test environment

### What needs to be done

- Diagnose the Cloudflare remote-proxy authentication failure using the installed tooling's supported workflow. Restore authentication or configure an explicitly supported local mode for local-only features.
- Document which tests use local substitutes and which require real staging bindings/providers. Local substitutes cannot establish production integration success.
- Restore a usable browser automation session and verify it can load and interact with the app.
- Configure test startup/base URL so end-to-end tests have a running server. Use a staging database and synthetic CVs for destructive, failure and account tests.
- Correct writable log configuration through supported settings; keep credentials and CV content out of recorded logs.
- Check Vexp index/tool availability. If skeleton or completion verification remains unavailable, record that limitation and use direct source checks and project tests rather than treating it as an application defect.

### What good implementation looks like

A documented startup command brings up a reachable app in a fresh session. Required environment-variable names are documented without secret values. The browser can edit a synthetic draft and reload it. Staging integration tests exercise the same bindings and authentication model intended for production.

### Tests that prove it worked

1. Start the app from a fresh terminal using the documented steps; verify homepage, checker and builder load without authentication-proxy errors.
2. Open a fresh browser session, enter synthetic text, navigate and reload. Confirm interaction works rather than merely checking an HTTP response.
3. Exercise one staging server-function request and verify its expected response. Record whether a real provider or test substitute handled it.
4. Run an existing browser smoke test against the configured base URL and retain its result/trace on failure.
5. Invoke the available Vexp verification tools once; record success or the exact remaining limitation.

**Done when:** repeatable runtime/browser checks are possible. Vexp failure alone does not block release if equivalent code/test evidence is available and documented. Audit task A08, environment portion.

## Plan 3 — Correct account and document flows

### What needs to be done

- Default scope: finish the existing account feature. If accounts are deliberately deferred, hide account/dashboard entry points and inaccessible routes consistently; describe a single device draft honestly and preserve existing saved data.
- Add a validated document identifier to builder navigation. Dashboard Edit must pass the selected identifier; loading must request that document for the current owner, not the latest document generally.
- Give New CV an explicit creation flow and a distinct identity. It must not reset the existing CV as a side effect.
- Fix dashboard hooks after the conditional return. Handle loading, missing documents, unavailable configuration and expired authentication explicitly.
- Preserve an anonymous draft when signing in. If the account already has CVs, offer to keep the draft as a new CV or open an existing one; do not silently overwrite either.
- Ensure deletion updates the dashboard and cannot be undone accidentally by a delayed autosave. Confirm destructive actions in the product before executing them.

### What good implementation looks like

Two CVs have independent identities and content. Editing CV A never changes CV B. A bookmarked builder URL opens the correct CV after authentication. Missing or unauthorised IDs show a safe message without exposing another user's data. Creating, switching or deleting documents cannot leave old autosave work attached to the wrong document.

### Tests that prove it worked

- Create CV A and B with different synthetic names; edit A, reload, then open B. Each retains its own content.
- Click New CV with existing documents present. Verify a blank, distinct document and unchanged originals.
- Load a valid document URL directly, then test missing and malformed identifiers. No crashes or unintended document creation.
- Sign in with an anonymous draft and an existing cloud CV. Verify both user choices preserve the document not selected.
- Sign out/sign in while loading and while saving. Verify stable hook execution and correct document ownership.
- Delete a disposable staging CV while a save is pending. Verify it does not reappear; cancel deletion and verify it remains unchanged.
- Run the two-user access tests in Plan 5 against actual database policies.

**Done when:** the full account flow passes or the explicitly chosen account-free release scope is consistent across navigation, routes and copy. A02.

## Plan 4 — Useful quality checks and truthful lead capture

### What needs to be done

- Fix the 17 recorded TypeScript errors at their causes: guard optional Supabase clients, align template/colour types, supply valid route search properties and reconcile analytics event types.
- Do not weaken strictness, add blanket suppressions or remove useful assertions to obtain a passing result.
- Scope lint away from archived worktrees, dependencies and generated output, while retaining maintained app/test code. Normalise formatting consistently and keep bulk formatting separate from behavioural fixes where practical.
- Define an explicit lead payload allowlist. Recommended default: omit CV-derived name/email from outreach payloads unless there is a documented need and the UI explains that use. Record the chosen contract before changing the failing test.
- Return lead success only after an intended durable destination confirms acceptance. Treat downstream notification failure separately from successful storage.
- Handle invalid phone numbers, duplicate submissions, provider errors and retries. Keep Skip available and do not make marketing capture a prerequisite for editing/export.
- Add repeatable typecheck, lint, unit-test and build checks to the project's normal verification workflow. Explain every remaining skipped test and whether it leaves a launch-critical gap.

### What good implementation looks like

Quality commands give actionable results on maintained code. A saved lead can truthfully show success even if a staff notification fails, but a lead that reached no durable destination cannot. Retries do not create duplicate records or duplicate outreach jobs. Payload tests verify approved fields and prohibit unintended CV content.

### Tests that prove it worked

- Run typecheck, scoped lint, the full unit suite and production build; all must exit successfully. Review warnings instead of automatically accepting them.
- Test exact allowed payload fields; assert CV text, full resume objects and unapproved personal fields are absent.
- Simulate successful storage, database rejection, timeout, unavailable fallback and non-success webhook responses. Verify the correct success/error/skip UI for each.
- Simulate storage success plus notification failure. Confirm the user is not told to resubmit an already stored lead.
- Double-submit and retry the same synthetic lead. Verify the chosen duplicate-handling policy and no duplicate notification scheduling.
- Skip capture and complete CV editing/export without submitting a phone number.

**Done when:** green checks reflect intended behaviour and the lead flow reports reality. A06/A07.

## Plan 5 — Data ownership and public endpoint protection

### What needs to be done

- Inspect actual staging/production database policies and grants before proposing changes. Check in a reproducible schema/policy migration for maintained tables where missing.
- Restrict CV read/create/update/delete operations to the authenticated owner. Reject attempts to change ownership. Keep privileged service credentials server-side.
- Review lead endpoints that use privileged clients: validate input and authorise updates independently of possession of a submitted lead ID. Do not expose lead records publicly.
- Enforce free/paid behaviour on the server. For a free launch, ignore/reject caller attempts to activate paid processing; do not build payments merely to justify the existing flag.
- Apply server-side bounds to text lengths, file-processing limits and arrays. Define configurable request quotas and provider spending/concurrency limits before enabling public AI calls.
- Use shared rate-limit state suitable for the deployed runtime; do not rely solely on memory within one instance. Return understandable retry responses.
- Require staff authorisation on metrics server functions themselves, not only the page. Verify any edge controls rather than assuming they exist.

### What good implementation looks like

Knowing another document ID never grants access. Calling an endpoint directly receives the same protection as clicking through the UI. Rate limits survive multiple app instances, and a client-supplied tier cannot increase AI access. Limits have recorded values and a known recovery behaviour.

### Tests that prove it worked

| Scenario | Required result |
|---|---|
| Two ordinary test users access each other's CV IDs through the database API | Cross-user select/update/delete fail or return no accessible rows; owners retain intended access. Use ordinary credentials, not the service key. |
| User forges another owner ID on insert/update | Request is denied; ownership cannot be reassigned. |
| Anonymous caller queries CV/lead tables | No private records are exposed. |
| Caller guesses a lead ID and submits an update | No unauthorised modification or personal-data disclosure. |
| Caller changes tier to paid or omits it | Only server-authorised processing runs; verify provider invocation counts. |
| Boundary and oversized input | Allowed input succeeds; one-over-limit input is rejected before expensive processing. |
| Quota exceeded across repeated/concurrent requests | Limit is enforced, clear retry behaviour is returned, and excess provider calls do not occur. |
| Anonymous/non-staff caller invokes metrics directly | Access is denied; authorised staff can access intended aggregates. |

**Done when:** results are recorded against actual policies and deployment controls. Mocked security tests alone are insufficient. A04 database portion/A05.

## Plan 6 — Privacy, support and accurate copy

### What needs to be done

- Add reachable privacy, terms and support pages that describe actual storage, processors, retention choices and contact routes. Confirm operational details before publishing promises; this plan is not a legal-compliance determination.
- Add a clear-device-draft action and a working cloud deletion/account-data request route appropriate to launch scope. Distinguish browser cleanup from server deletion.
- Keep outreach opt-in explicit. Explain any CV-derived fields sent with it, and provide an unsubscribe process that actually reaches the operational system.
- Verify Clarity settings and explicitly protect rendered previews, feedback and other surfaces containing personal text. Connect consent handling to analytics where applicable; disabling analytics until verified is an acceptable launch choice.
- Correct the FAQ's account requirement, free-access description, ATS claims and job-alert promises. Use configured production URLs for social metadata.

### What good implementation looks like

A user can understand where their CV goes, decline marketing, clear a device draft and request/delete cloud data without ambiguity. Rendered CV content is not visible in analytics recordings. Product copy describes the app's own assessment without promising interviews or universal ATS acceptance.

### Tests that prove it worked

- Follow footer/help links on desktop and mobile; each reaches real content and a usable contact route.
- Clear a synthetic device draft and reload. Verify all intended draft keys are removed, while the UI correctly describes any cloud copy that remains.
- Delete/request deletion of disposable staging data and confirm the documented result across the intended stores; ensure delayed saves cannot recreate it.
- Decline outreach and complete export. Verify no lead/outreach request was generated.
- Use a unique synthetic marker in CV fields and previews, then inspect permitted analytics recordings/requests. The marker must not be exposed; consent choices must produce the intended tracking behaviour.
- Manually compare public copy and metadata against tested access, scoring and job-alert behaviour.

**Done when:** data controls and promises are verifiable, not merely present as text. A03/A04 analytics portion/A09.

## Plan 7 — End-to-end CV, PDF and accessibility acceptance

### What needs to be done

- Preserve the existing import-to-builder mapping and verify it with synthetic selectable PDFs, DOCX files, scanned PDFs, pasted text and unreadable inputs.
- Make import failures recoverable: offer paste/manual entry and preserve the existing draft until replacement is confirmed.
- Add a final review for missing contact details, incomplete experience, inconsistent dates and the generated PDF page count. Warnings should link to editable fields; optional sections must remain optional.
- Associate labels, hints and errors with inputs using stable IDs. Ensure modals/drawers support keyboard navigation, Escape and appropriate focus restoration.
- Investigate PDF font warnings with actual output. Exercise all seven templates with short, long and awkward content. Keep real text selectable where intended and preserve correct reading order.

### What good implementation looks like

Imported facts survive the journey without invented jobs or certifications. A failed upload never destroys the draft. Users can fix flagged details or deliberately continue past advisory warnings. A downloaded PDF opens on the target phone and matches its selected template/content without clipped sections or missing characters.

### Tests that prove it worked

1. **Import fixtures:** verify names, dates, roles, experience and certifications against known expected values. For unreadable input, verify actionable failure and manual fallback, not a false-success empty CV.
2. **Complete journey:** start fresh, import/check, enter builder, fix content, save, reload, change template and download. Verify the same content after reload and in the exported file.
3. **Template matrix:** generate each of seven templates with short, multi-page and stress fixtures containing long names, accented characters, URLs and dense bullets. Extract text to check completeness and inspect every rendered page for clipping, overlap and unexpected blank pages.
4. **Actual download:** verify a real PDF file is produced and opens; a button click or download event alone is insufficient proof.
5. **Failure recovery:** simulate generation failure; verify retry works and draft content remains intact.
6. **Device coverage:** run desktop Chromium/Firefox/WebKit and configured mobile profiles; additionally check at least one real iPhone/Safari and Android/Chrome for keyboard, scrolling and download/open behaviour. Record unavailable devices as unverified.
7. **Accessibility:** navigate core forms and dialogs using only the keyboard; verify visible focus, meaningful input names, announced errors and no focus traps. Perform a screen-reader spot check on the main journey.

**Done when:** actual files and device results substantiate the core journey. A08 functional portion/A12. Promote basic label fixes into the release gate even though A12 was originally grouped with P1 enhancements.

## Plan 8 — Simpler onboarding, relevant guidance and loading

### What needs to be done

- Present two entry choices: Improve my existing CV / Start a new CV. Make returning to a saved draft obvious without resetting it.
- Recommend one role-appropriate template and retain the other options under Change style. Switching design must preserve content.
- Refine the existing checklist to the three most important fixes, with direct links and role-relevant examples. Keep remaining recommendations accessible and show accurate completion counts.
- Adapt prompts for service, housekeeping, reception and culinary roles. Do not hide or discard data when the target role changes; suggestions must not invent experience.
- Measure production loading first. Then defer heavy PDF/import dependencies until needed, with useful loading/error states. Do not optimise only the named builder chunk while leaving total initial transfer unchanged.

### What good implementation looks like

A first-time user knows the next step immediately. Existing drafts and content survive role/template changes. Heavy optional features do not delay basic editing. Performance comparisons use the same build mode, device/network settings and route, and include the cost of first import/export.

### Tests that prove it worked

- Test both entry choices and returning-draft behaviour; verify no unintended reset.
- Change target role and templates with populated content. Verify all original facts remain intact and examples adapt appropriately.
- Complete a checklist fix and verify its state/count updates; open each suggested fix and confirm the correct field is reached.
- Compare cold-cache production runs before/after on the same constrained mobile profile. Record total initial JS transfer, time until basic fields are usable, layout shifts and first import/export time over at least three runs.
- Proposed performance acceptance: reduce initial builder JavaScript transfer by at least 25% from the measured baseline without a new interaction regression or broken import/export. Confirm this target after recording the baseline; it is not a result already achieved.

**Done when:** interaction checks pass and repeatable measurements show improvement. A10/A11/A13.

## Plan 9 — Applicant pilot and release decision

### What needs to be done

- Recruit 5-10 representative hospitality applicants after the technical gates pass. Use permissioned data and record observations without copying private CV content into reports.
- Ask participants to produce a usable CV on their own phones. Observe before helping, and record where assistance becomes necessary.
- Track start, import success/failure, builder entry and successful export using privacy-safe events. Distinguish download initiation from verified file generation.
- Fix repeated blockers, rerun affected acceptance tests and repeat the affected pilot scenario.

### What good implementation looks like

The release decision is supported by real completion evidence, not just passing component tests. Applicants understand the score, know what to fix and can retrieve their final CV. Support and operational ownership are clear for reported save/export failures.

### Tests that prove it worked

- Record device/browser, chosen role, completion, assistance, abandonment point, elapsed time and whether the PDF opened correctly.
- Proposed target: at least 80% complete without assistance (8 of 10 when testing ten people). A small pilot is directional evidence, not statistical proof.
- Any observed data loss, cross-user access or consistently broken download blocks release regardless of the completion percentage.

**Done when:** results are recorded and critical issues are closed or the launch remains explicitly blocked. A14.

## Final verification commands and evidence

Run these against the release candidate after the relevant focused tests pass:

```powershell
npx.cmd tsc --noEmit
npm.cmd run lint
npm.cmd test -- --reporter=dot
npm.cmd run build
npm.cmd run test:e2e
```

The end-to-end command requires the documented server/base URL and installed target browsers. A passing build does not replace type checking, real database tests, file inspection or device testing. Run applicable Vexp completion verification when available; document a tooling failure instead of recording a pass.

For each audit task, add this evidence to `audit.md`:

| Field | Required entry |
|---|---|
| Status | Open / In progress / Blocked / Verified |
| Change | What changed and relevant files/commit |
| Environment | Local/staging/production; browser/device; real service or substitute |
| Verification | Command or scenario, date, actual result and evidence path |
| Remaining limitations | Skipped tests, unavailable devices, warnings or external dependencies |

## Release gate

- [ ] Latest edits survive reload and failure; saved status is truthful.
- [ ] Account/document flows work, or the reduced account-free scope is explicit and consistent.
- [ ] Typecheck, maintained-code lint, unit tests and build pass; skipped coverage is understood.
- [ ] Real database ownership and public endpoint controls pass their negative tests.
- [ ] Privacy, outreach, deletion/support and analytics behaviour match public copy.
- [ ] The full CV journey and actual PDFs pass the template/device checks.
- [ ] Critical pilot failures are resolved; release-candidate evidence is linked in `audit.md`.

Prepare deployment and rollback steps for the actual hosting environment before release. If a regression appears, preserve user data and disable the affected feature where possible; do not use destructive data cleanup as a rollback strategy. This document does not deploy or publish the app.
