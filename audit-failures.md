# GetHired audit: failures and verification blockers

Source: [audit.md](audit.md), reviewed 7 September 2026.

This document extracts what failed and what went wrong during the recorded audit. It distinguishes failed checks, application problems identified in source, and checks that could not be completed. No checks were rerun and no application fixes were made for this extraction.

## 1. Automated checks that failed

| Check | Recorded result | What went wrong | Required follow-up |
|---|---|---|---|
| Unit tests: `npm test -- --reporter=dot` | 1 failed, 607 passed, 13 skipped across 61 test files. | `checker-score-regression` expected a lead webhook payload without `full_name`, but the payload now includes it. Implementation and the test's data contract disagree. The audit did not establish which should change. | Decide which personal fields are intentionally disclosed, then align the payload and test. Rerun the suite and review skipped coverage. Task A06/A07. |
| Type checking: `npx tsc --noEmit` | 17 errors. | Errors include nullable Supabase clients, incompatible template photo shapes, colour types, missing route search properties and an undeclared analytics event. | Resolve the reported errors and rerun type checking. Task A07. |
| Lint: `npm run lint` | 47,815 findings; command failed. | The scan includes archived `.claude/worktrees` content and produces mostly formatting findings. This obscures actionable issues in maintained application code. The total is not a count of functional app defects. | Exclude archived/generated content as appropriate, lint maintained files and resolve the remaining findings. Task A07. |

## 2. What blocked the audit itself

### Local development server could not start

- The configured Cloudflare remote development proxy could not refresh authentication.
- The permitted elevated retry still failed with HTTP 400.
- Consequently, the audit did not establish a working local runtime for the browser journey.
- Restore valid development authentication or a supported local development configuration, then repeat runtime checks. Task A08.

### Browser control failed

- Browser control returned a session error.
- No completed visual, keyboard-accessibility, real-device or end-to-end browser pass was recorded.
- This is an audit-tooling failure, not evidence that the deployed app fails to render.
- Restore a working browser session and test import, editing, save/reload, preview and download on target browsers/devices. Task A08.

### Vexp did not provide the expected verification

- The context pipeline returned limited pivot files.
- Skeleton extraction returned no data.
- `verify_done` returned `Unknown tool`.
- Source inspection and direct project checks supplied the available evidence, but Vexp's intended completion verification was unavailable.
- Repair tool availability/index coverage before relying on Vexp for subsequent change verification.

## 3. Application problems identified in source

These findings came from code inspection. The blocked browser review means their full user-visible effects were not reproduced during this audit.

| Finding | What went wrong | Potential user impact | Follow-up |
|---|---|---|---|
| Save status does not track the edited CV. | `src/components/ui/AppHeader.tsx:5` creates its own `useResumeStore()` instance, separate from the builder. The hook holds component-local state and runs its own hydration/save effects. | The header can show a saved state that does not represent the active edits. | Share one store between the builder and header. A01. |
| Cloud-save failures are not handled correctly. | `src/lib/resume-store.ts` does not inspect Supabase's returned save errors. | A failed save can go unnoticed; recovery and data-loss behaviour remain unverified. | Inspect errors, show truthful status, retain recovery data and test interrupted saves. A01. |
| Dashboard document actions are incomplete. | Edit and New CV point to the homepage; the store loads the latest CV rather than a selected document ID. | Users cannot reliably open a specific saved CV or start a distinct new document through those actions. | Implement selection/creation semantics or defer accounts explicitly. A02. |
| Dashboard hook ordering needs correction. | Hooks occur after a conditional return. | Changing authentication state may produce inconsistent hook execution; runtime behaviour was not verified. | Fix hook ordering and test sign-in/sign-out transitions. A02. |
| Lead capture can report false success. | Success can be reported without confirmed persistence. | Users may believe they subscribed successfully when their details were not saved. | Confirm persistence and offer truthful retry/skip feedback. A06. |
| Account messaging contradicts implementation. | The homepage FAQ says an account unlocks the builder, although anonymous building is implemented. | Users may think registration is required unnecessarily. | Align public copy with actual access. A09. |
| Shared form labels lack control association. | The shared Field component omits label association with inputs. | Accessible naming and label-click behaviour may be impaired. | Associate labels and errors with controls, then test keyboard and assistive-technology behaviour. A12. |

## 4. Release gaps and unverified protections

These are recorded gaps or unresolved questions, not confirmed production breaches or demonstrated exploits.

- **Privacy, terms and support:** no corresponding routes were found. Storage, AI processing, lead recipients and deletion/support paths need clear explanations and verification. A03.
- **Database access:** deployed ownership policies were not inspected. The resumes table definition is absent from the checked-in migration reviewed. The lead migration enables RLS, but production settings remain unverified. A04.
- **Analytics:** Clarity masking of rendered CV previews and consent handling were not verified. A04.
- **Abuse protection:** no application-level throttling or bot checks were found in source. Existing edge protection was not verified. Input bounds, quotas and public AI/lead protections need review. A05.
- **AI tier selection:** the checker accepts a caller-supplied free/paid tier and defaults to paid. Server-side eligibility enforcement needs attention; no exploitation test was completed. A05.
- **Internal metrics:** staff-only access needs to be established. A05.
- **Product promises:** categorical ATS rejection claims, job-alert delivery promises and production social URLs require correction or verification. A09.

## 5. Build warnings that were not build failures

`npm run build` exited successfully and generated client/server artifacts. The following concerns were recorded:

- Large chunks: the builder client chunk was approximately **1.605 MB minified / 535 KB gzip**, excluding other chunks/assets. This is a payload measurement, not proof of a specific mobile load time.
- PDF fontkit export warnings require investigation and real export checks; the warnings alone do not establish broken PDFs.
- Restricted Wrangler log-file access was reported. It did not prevent production compilation from completing.

Follow-up: inspect exported PDFs across all seven templates and measure mobile performance before and after any loading changes. A08/A13.

## 6. What the audit could not conclude

The recorded audit does **not** confirm:

- End-to-end success from CV import to PDF download.
- Reliable cloud saving, draft recovery or account transitions.
- Accurate import of real applicants' CVs.
- Readable, unclipped PDFs across every template and target device.
- Visual quality, keyboard accessibility or real-phone usability.
- Correct production AI provider configuration.
- Effective production database isolation, edge abuse controls or analytics privacy settings.

The 13 skipped tests also remain outside the evidence provided by the passing test count.

## 7. Recovery order

1. Restore development-server authentication and browser control so runtime verification is possible.
2. Fix the shared saving flow, error handling and dashboard document actions.
3. Resolve the lead data contract, false-success handling and TypeScript errors; make lint scope useful.
4. Address the privacy/access-control gaps and verify production protections.
5. Rerun automated checks and complete desktop/mobile import-to-export and save/reload testing.
6. Record actual results in `audit.md`; close tasks only when their acceptance checks pass.

All items above remain open according to the source audit. Feature expansion and optional design improvements are outside this failure extraction.
