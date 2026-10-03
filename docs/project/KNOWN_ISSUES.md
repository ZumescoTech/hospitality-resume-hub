# Known issues

Observed 2026-09-22 unless stated otherwise. OPEN means unresolved. P0 blocks real users; P1 blocks limited public release; P2 may follow initial release. Verification gaps are explicitly distinguished from demonstrated failures. No product fix was made during this audit.

## ISSUE-017 ? Historical committed credentials

Status: **CLOSED ? owner-confirmed credential rotation and access review; historical Git objects retained by decision**.

Severity: P0. Closed 2026-09-27 after repository remediation and owner confirmation.

### A. Confirmed repository evidence

First observed by the project audit on 2026-09-22; independently reproduced on 2026-09-23 at HEAD `d84292a46c8782c566f38f5e44dacf00d0640294` on `main`.

| Historical variable | First-known reachable evidence | Service / sensitivity | Current use |
|---|---|---|---|
| ANTHROPIC_API_KEY | 95eca08, 2026-06-12 10:13:07 +02:00; .env line 2, blob 0367b060e02f | Groq-shaped credential despite Anthropic label; owner must confirm issuing account/provider | No current source/CI consumer of this label. GROQ_API_KEY is the current Groq configuration name; equivalence of deployed values is unknown |
| SUPABASE_SERVICE_ROLE_KEY | 3f73806, 2026-06-12 10:57:22 +02:00; .env line 5, blob 79087d856367 | JWT-shaped credential with unverified service_role payload claim; privileged Supabase access if valid | src/lib/cruise-cv-check.ts getLeadDb, used by persistCvLead and persistLeadJourney |
| GOOGLE_SHEETS_LEAD_WEBHOOK_URL | 95eca08; .env line 1, both historical blobs | Historical webhook endpoint; owner confirmed it is unused | Removed from active application, sample environment, operations instructions, and deploy workflow |
| VITE_SUPABASE_URL | 3f73806; .env line 3 | Public service location, not itself a privileged credential | Browser Supabase client and server lead URL fallback |
| VITE_SUPABASE_ANON_KEY | 3f73806; .env line 4 | Nonempty public-client-key setting; no JWT pattern match, validity/type unverified | Browser Supabase client; CI build input. Do not classify public client configuration as a privileged secret solely from its name |

The earlier audit named the first two credential-shaped settings. This review additionally inventories the other historical assignments and the webhook risk. One distinct historical value per variable was found across the two .env versions; values were handled only in process memory and never displayed or written to evidence files. No signature, authentication or live validity check was performed.

Commits c9b7500 and 2cfe130 on 2026-07-06 removed/untracked .env; their trees contain no .env. Removal did not erase the two reachable historical blobs. Earliest evidence here means locally reachable Git evidence, not a proven first external disclosure time. No remote fetch, fork inventory or remote-retention claim is implied.

### Current source, ignore and deployment status

- Starting inventory: 390 tracked/nonignored paths, 343 existing files and 47 pre-existing tracked deletions. Raw-byte credential-pattern scan found zero matches in existing files; the Git index also had zero matches. No current file contained an exact historical assignment value for any of the five variables above.
- Scan covered recognizable provider-key formats, JWTs, private-key headers and credential-bearing URLs. All 844 reachable blobs were inspected (including binary blobs); only the two historical .env blobs matched these patterns. This differs from the previous 786-text-blob count because binary blobs were included. Unknown formats, encoded/compressed content, ignored local files, remote-only refs, CI logs/artifacts and provider stores are not certified clean.
- .env is not tracked. Rules ignore `.env`, `.env.*`, `.dev.vars`, and `.dev.vars.*`; `.env.example` is deliberately included with placeholders. `git check-ignore --no-index` verified `.dev.vars`, `.dev.vars.production`, and `.dev.vars.staging`.
- `.github/workflows/deploy.yml` builds using VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / VITE_CLARITY_PROJECT_ID and provisions GROQ_API_KEY and SUPABASE_SERVICE_ROLE_KEY for the production Worker. The historical Google Sheets webhook is no longer wired into source or deployment. It also uses CLOUDFLARE_API_TOKEN; no historical exposure of that token was found.
- Current source consumers are GROQ_API_KEY in the AI router, builder assistance and builder parser, and SUPABASE_SERVICE_ROLE_KEY in server-side lead persistence. CI workflow wiring and operations instructions name the corresponding replacement settings without exposing values. The owner confirmed affected credentials were replaced/rotated. Remote secret values were not inspected.
- The tracked-path pattern check found only `.env.example`, whose credential-shaped settings are placeholders. The prior bounded history review covered 844 reachable Git blobs and found historical credential-pattern matches only in the two known `.env` blobs. This is not a claim that historical Git objects were erased.

### B. Owner/provider verification and action ledger

| Required owner action | Evidence / status |
|---|---|
| Invalidate/replace affected Groq and Supabase credentials and update applicable consumers | **OWNER CONFIRMED COMPLETE** 2026-09-27; no values inspected |
| Determine webhook use/sensitivity and remove any active use | **OWNER CONFIRMED UNUSED**; removed from source, sample config, operations instructions, and deployment wiring. A manual command is documented to delete any residual production Worker secret; it was not executed here |
| Review provider usage/billing and database/webhook access | **OWNER CONFIRMED COMPLETE**; no suspicious activity found |
| Decide Git-history cleanup after rotation | **OWNER DECISION: do not rewrite history; retain rotated values only as historical exposure; cleanup is non-blocking** |
| Verify repository wiring and secret-file ignore coverage | **PASSED**; only variable names/wiring inspected, `.dev.vars.*` and `.env*` ignore coverage checked |

For Supabase, issuing a new key alone does not invalidate an old legacy key. Use the current [provider API-key guidance](https://supabase.com/docs/guides/getting-started/api-keys) and confirm explicit invalidation in the owner dashboard. Do not validate historical keys by sending requests. New-key verification must use synthetic data in an approved environment.

### History cleanup decision

**Owner decision (2026-09-27): do not rewrite Git history.** Rotated credentials remain in reachable history only as historical exposure. History rewriting is non-blocking and was not performed. This closure does not claim that historical objects were erased or that Release 0.1 is ready.

Historical values remain retrievable by anyone with relevant repository history. Credential rotation and owner-reported access review address active validity/use; repository closure does not certify remote-only refs, forks, logs, or artifacts.

### Exact closure conditions

1. Owner confirms all affected credentials are rotated/replaced and the access/usage review is complete.
2. The owner confirms the historical webhook is unused; all active code, sample configuration, deployment wiring, and operations instructions for it are removed.
3. Current source wiring for affected secret consumers and ignore coverage are checked without revealing values; prior bounded history scan remains recorded.
4. Owner explicitly decides not to rewrite history and accepts rotated credentials remaining as historical exposure. This cleanup is non-blocking.
5. Record owner confirmations without secret values. Closure does not imply Release 0.1 readiness.

The residual Worker secret cleanup is an operator follow-up because deleting a
remote Worker secret is a destructive operation. No application code or deploy
workflow consumes or provisions the retired webhook.

### Verification record

Security verification only; no credential was authenticated and no secret value was inspected or printed. The owner confirmed credential replacement and access/usage review with no suspicious activity on 2026-09-27. Repository checks verified secret-name wiring, removed the unused historical webhook consumer, and verified ignore coverage. The prior bounded history scan is documented in the [2026-09-23 incident journal](../sessions/2026-09-23-01-credential-incident.md); this closure does not erase historical Git objects. See the [2026-09-27 closure journal](../sessions/2026-09-27-02-issue-017-closed.md) for the current evidence and follow-up.

Focused `tests/unit/leads.test.ts` passed 5/5. In
`tests/unit/checker-score-regression.test.ts`, 11 tests passed and the
pre-existing webhook-payload key contract test failed because `full_name` is
present; this is recorded under ISSUE-009 and is unrelated to the removed
Google Sheets transport. No production secret deletion, provider request, or
deployment was performed.

## ISSUE-001 — Vulnerable server serialization dependency

Status: OPEN; dependency confirmed, no exploitation attempted.

Severity: P0

First observed: 2026-09-22

Affected area: TanStack server functions / supply chain.

### Problem
Locked/installed seroval 1.5.2 is covered by a critical deserialization advisory.

### Evidence
npm audit: 26 advisories, one critical. Installed start-server-core/src/server-functions-handler.ts imports fromJSON and calls it with plugins on request payloads. [GHSA-mv8w-475r-vwqw](https://github.com/advisories/GHSA-mv8w-475r-vwqw) identifies <=1.5.2 and patch 1.5.3, with TanStack downstream impact.

### Reproduction
Read lockfile and run npm audit; inspect installed handler. Do not probe production.

### Likely cause
Dependency lock predates security patches.

### Current workaround
Restrict to synthetic local testing; no assurance for public deployment.

### Recommended fix
Small compatible dependency remediation, frozen install and server-function regression. Verify deployed versions separately.

### Related files
package.json, package-lock.json, .github/workflows/deploy.yml; DEPENDENCY_AUDIT.md.

## ISSUE-002 — Resume ownership policies cannot be verified from repository

Status: OPEN — verification gap, not a confirmed cross-user leak.

Severity: P0

First observed: earlier audit; reconfirmed 2026-09-22.

Affected area: Supabase resumes read/upsert/delete.

### Problem
resumes DDL, grants and RLS are absent. Client filtering cannot protect database access from altered requests.

### Evidence
Only CRM migration checked in. resume-store filters user_id; dashboard delete filters only id. No live cross-user tests.

### Reproduction
Inventory migrations and queries. In an approved test environment, verify anon and A/B SELECT/INSERT/UPDATE/DELETE including ownership reassignment.

### Likely cause
Schema configured outside this repository; history of that setup unknown.

### Current workaround
Synthetic/mock account tests only.

### Recommended fix
Capture deployed schema/policies safely, establish reproducible ownership migrations/tests; do not rely on UUID secrecy.

### Related files
src/lib/resume-store.ts, src/routes/dashboard.tsx, supabase/migrations.

## ISSUE-003 — Public privileged lead, diagnostics and AI boundaries

Status: OPEN — source-confirmed missing controls; edge rules unknown.

Severity: P0

First observed: 2026-09-22; earlier audit identified endpoint protection gaps.

Affected area: Server functions.

### Problem
Lead updates use service-role access with caller-supplied UUID/phone and no owner proof. Diagnostics expose raw recent error entries publicly. Paid AI is caller-selectable and text inputs are unbounded; no application quotas found.

### Evidence
persistLeadJourney selects/updates leadId; persistCvLead returns existing ID by phone. getUploadFailures has no staff guard; LogSchema permits arbitrary strings. CvCheckSchema defaults paid. No middleware auth/rate control found.

### Reproduction
Inspect handlers; use synthetic isolated RPC tests for authorization and payload bounds. Do not update real leads.

### Likely cause
Internal/MVP handlers were made public without separate privilege controls.

### Current workaround
Do not expose these paths to real traffic pending controls.

### Recommended fix
Enforce ownership/session proof, staff diagnostics, strict safe telemetry schema, server-enforced tier and request/cost limits. Verify existing edge rules rather than assuming none exist.

### Related files
src/lib/cruise-cv-check.ts, metrics-api.ts, upload-failure-log.ts, parseCvForBuilder.ts, ai/builder-assist.ts.

## ISSUE-004 — Privacy/retention and replay masking unresolved

Status: OPEN — storage confirmed; replay leakage not observed.

Severity: P0

First observed: earlier audit; reconfirmed 2026-09-22.

Affected area: CV PII, browser storage, analytics, fixture repository.

### Problem
Raw CV text remains in anonymous localStorage without expiry. Clarity runs globally with no explicit sensitive report/preview masks. No privacy/support/deletion routes; fixture provenance unknown.

### Evidence
checker-draft-v1 includes cvText; handoff sourceText; account/anonymous recovery copies; clarity.ts external masking comment. Named events are PII-free but replay may capture rendered text. CV PDFs and exports are tracked.

### Reproduction
Use synthetic CV, inspect storage/replay and deletion/signout behavior. Review fixture consent without copying contents into docs.

### Likely cause
Persistence/analytics added before explicit data policy.

### Current workaround
Synthetic local mode disables Clarity; no real data in audit.

### Recommended fix
Accurate data disclosure, retention/deletion and shared-device handling; verify masking on all PII surfaces or disable replay there; review fixture permissions.

### Related files
src/lib/clarity.ts, cv-import-handoff.ts, resume-persistence.ts, checker route, cv-tests, cv-templates, cv-journey-artifacts.

## ISSUE-005 — Dashboard crashes and cannot select/new documents

Status: OPEN — browser confirmed.

Severity: P0 for account path.

First observed: 2026-09-22 for missing provider; earlier audit noted navigation/hooks.

Affected area: /dashboard after signup/signin.

### Problem
Route invokes useQueryClient without a provider; hooks follow an early conditional return. Edit/New links go home rather than selecting/creating a CV.

### Evidence
Local browser /dashboard showed “No QueryClient set, use QueryClientProvider to set one”; no provider in src. ESLint reports conditional hooks.

### Reproduction
Open /dashboard on local server. Inspect ResumeCard links and route search schema.

### Likely cause
Incomplete auth/dashboard integration.

### Current workaround
Anonymous /builder for synthetic testing; not a saved-report solution.

### Recommended fix
Provide shared QueryClient, stable hook ordering and explicit document selection/new semantics with ownership tests.

### Related files
src/routes/dashboard.tsx, src/router.tsx, src/routes/__root.tsx, src/lib/resume-store.ts.

## ISSUE-006 — Original analysis disappears on navigation/reload

Status: OPEN — browser confirmed.

Severity: P0 for intended save/signup journey.

First observed: 2026-09-22.

Affected area: F005/F006.

### Problem
Report is React memory only; URL step=results contains no result identity. Signup cannot preserve/retrieve original report.

### Evidence
Synthetic waiter reached 56/100; reload resulted in zero report score elements. No analysis table/ID. Builder audit is only a subset.

### Reproduction
Score a synthetic CV, refresh, or go back then forward; navigate through signup.

### Likely cause
Draft persistence saves input rather than completed result.

### Current workaround
Recheck retained input; this is not saved-report continuity.

### Recommended fix
Versioned validated report identity/persistence and safe auth return flow, reusing current patterns.

### Related files
src/routes/tools/cruise-cv-checker.tsx, src/lib/cv-import-handoff.ts, sign-in/up.tsx.

## ISSUE-007 — Recommendations encourage unsupported candidate claims

Status: OPEN — source and synthetic browser evidence.

Severity: P0 trust gate.

First observed: 2026-09-22.

Affected area: F003/F004.

### Problem
Missing keyword advice can instruct adding credentials/skills without “if true.” Examples contain specific numeric outcomes without a consistent truth constraint. Model schemas validate types, not factual grounding.

### Evidence
genericSuggestion says Add keyword as requirement; browser test suggested adding 4-star with no such candidate evidence. Some STCW/Opera/WSET suggestions similarly assume facts. No completed hallucination/injection matrix.

### Reproduction
Use a truthful synthetic CV missing role keywords; inspect generated suggestions. Test negation/keyword stuffing and malicious instructions separately.

### Likely cause
Keyword absence converted directly into prescriptive claims.

### Current workaround
Founder-reviewed synthetic reports only.

### Recommended fix
Evidence/missing/unclear states and conditional truthful actions; constrain/review AI outputs and run launch adversarial/semantic tests.

### Related files
src/lib/cvFeedback.ts, cruiseCvRubric.ts, ai/provider.ts, ai/builder-assist.ts, localEngine.ts.

## ISSUE-008 — Parser contract, OCR deadline and truncation gaps

Status: OPEN — source findings, real binary fixture matrix unverified.

Severity: P1; silently incomplete evidence must be resolved before affected real-user OCR path.

First observed: 2026-09-22.

Affected area: F002.

### Problem
Bare string output has no version/warnings; PDF token order is flattened; only three OCR pages, silent omission; OCR race does not terminate on timeout, and worker creation precedes timer.

### Evidence
extractCvText.ts OCR_MAX_PAGES=3, Promise.race, return string; Mammoth messages ignored. No 30+ binary fixture set.

### Reproduction
Synthetic 4–10-page scan, multi-column PDF, corrupt DOCX and stalled OCR initialization in isolated tests.

### Likely cause
Fallback bolted onto text-only contract.

### Current workaround
Text-based PDFs/DOCX/paste; disclose limitations before real use.

### Recommended fix
Versioned ParseResult with quality warnings, whole-parser timeout/cancel and no silently omitted evidence; fixture matrix.

### Related files
src/lib/extractCvText.ts, cvDeterministicChecks.ts, extraction-error.ts.

## ISSUE-009 — Lead capture reports success without persistence

Status: OPEN.

Severity: P1

First observed: earlier audit; reconfirmed 2026-09-22.

Affected area: WhatsApp/CRM.

### Problem
Server returns ok:true even without DB/webhook success; UI ignores ok and catch calls onSuccess. Job-opening promise has no verified delivery operation.

### Evidence
persistCvLead fallback and WhatsAppCaptureForm handleSubmit. Name/email props exist but checker does not pass them; full name later comes through builder journey.

### Reproduction
Mock DB/webhook failures or no configuration; verify success claim/advance.

### Likely cause
Best-effort lead capture conflated with confirmed submission.

### Current workaround
Skip capture; no delivery guarantee.

### Recommended fix
Explicit stored/not-stored/retry/skip outcomes and disclosed fields; resolve payload test deliberately.

### Related files
src/components/checker/WhatsAppCaptureForm.tsx, src/lib/cruise-cv-check.ts, leads.ts, checker-score-regression.test.ts.

## ISSUE-010 — Verification baseline is not green

Status: OPEN.

Severity: P1

First observed: earlier audit; current numbers 2026-09-22.

Affected area: unit/type/lint/E2E.

Cleanup update (2026-09-22): lint now excludes generated output and archived worktrees; 24,078 findings remain (24,065 errors, 13 warnings). Unit baseline remains 629 passed / 1 failed / 13 skipped and TypeScript remains at 14 errors. ISSUE-010 stays OPEN.

### Problem
One unit contract failure, 14 TS errors, 47,624 lint findings (47,595 errors/29 warnings), outdated smoke selectors. Cold concurrent saving test timed out then isolated 4/4 passed.

### Evidence
TEST_STRATEGY command ledger. Type errors: nullable Supabase, photo shapes, required search props, undeclared event. Lint includes old worktrees and formatting.

### Reproduction
npm test; npx --no-install tsc --noEmit; npm run lint; selected Playwright tests.

### Likely cause
Feature contract drift, incomplete type fixes, formatter/ignore configuration and stale E2E assumptions.

### Current workaround
Use isolated save tests as limited evidence; no green release claim.

### Recommended fix
Resolve functional contracts first, scope lint, repair smoke journey assertions; retain honest cold-start timings.

### Related files
tests/unit/checker-score-regression.test.ts, tests/e2e/smoke.spec.ts, eslint.config.js, auth routes, template photo props.

## ISSUE-011 — Measurement and usefulness loop missing

Status: OPEN.

Severity: P1

First observed: 2026-09-22.

Affected area: §5/F007.

### Problem
Most canonical events and all version metadata absent; no user usefulness rating/comment/analysis association. KV races, cached-check omissions and missing score_100 display skew counts.

### Evidence
AI_AND_ANALYTICS_AUDIT event table; telemetry incrementCounter/read loops; no Feedback schema/UI.

### Reproduction
Trace successful/error/cached flows and compare event contract; inspect metrics under concurrency.

### Likely cause
Earlier export/lead funnel differs from Release 0.1 learning goal.

### Current workaround
Manual synthetic observations only; cannot infer product usefulness.

### Recommended fix
Analysis identity first, canonical privacy-safe events and feedback with bounded duplicate handling.

### Related files
src/lib/clarity.ts, telemetry.ts, metrics-api.ts; checker/auth routes.

## ISSUE-012 — Product claims and role coverage conflict with spec

Status: OPEN.

Severity: P1

First observed: earlier audit; reconfirmed 2026-09-22.

Affected area: landing/report/F001.

### Problem
Categorical ATS claims and application-ready bands exceed evidence. FAQ says accounts unlock builder despite anonymous access. Fifteen profiles versus copy claiming 13; no custom/limited coverage/version metadata.

### Evidence
index.tsx FAQ; AtsScoreRing scoreBandLabel; cruise-roles.json. tierSummary in checker is unused; do not report its rejection text as displayed.

### Reproduction
Read rendered homepage/report and enumerate registry roles.

### Likely cause
Older marketing and scoring assumptions coexist with updated spec.

### Current workaround
Explain limitations during founder testing.

### Recommended fix
Honest current-product wording and reviewed/versioned supported role profiles; custom unsupported flow.

### Related files
src/routes/index.tsx, src/components/checker/AtsScoreRing.tsx, src/data/cruise-roles.json.

## ISSUE-013 — Accessibility and mobile acceptance incomplete

Status: OPEN.

Severity: P1 for labels/core controls; minor polish P2.

First observed: earlier audit; reconfirmed 2026-09-22.

Affected area: editor/report/FAQ.

### Problem
Field labels lack htmlFor and errors lack aria-describedby. Custom category/FAQ toggles lack expanded/control association. Full keyboard, contrast and device testing absent.

### Evidence
Field.tsx, index FaqItem, checker CategoryScoreRow; one 390px report has no overflow, not full accessibility proof.

### Reproduction
Inspect accessible names and keyboard navigation across forms/report; test 375/390/768/1280px and screen reader.

### Likely cause
Visual controls added without semantic acceptance checks.

### Current workaround
No full workaround; assisted testing only.

### Recommended fix
Small semantic fixes and focused keyboard/mobile tests; no redesign.

### Related files
src/components/builder/Field.tsx, src/routes/index.tsx, checker route, src/styles.css.

## ISSUE-014 — Deployment bypasses release gates

Status: OPEN.

Severity: P1

First observed: 2026-09-22.

Affected area: CI, staging, environment reproducibility.

### Problem
Main push auto-deploys after build without tests/type/lint/approval. Bun latest install differs from npm lock workflow; incomplete runtime secret provisioning. The staging KV placeholder and generated-config workflow were reconciled locally on 2026-10-03; release gates remain unresolved.

### Evidence
deploy.yml, bunfig.toml, wrangler.staging.jsonc, OPERATIONS.md. No observability block in Wrangler.

### Reproduction
Read pipeline stages; do not trigger deploy during audit.

### Likely cause
Prototype deployment flow predates Build → Test → Approve → Release → Observe.

### Current workaround
Do not promote this audit checkout.

### Recommended fix
Reproducible dependency install, validation/approval gate, staging isolation and smoke/rollback evidence; distinguish build-time VITE and runtime configuration.

### Related files
.github/workflows/deploy.yml, package-lock.json, wrangler*.jsonc, OPERATIONS.md.

## ISSUE-015 — Large route payloads and duplicate optional work

Status: OPEN — measured bundle size; user latency unmeasured.

Severity: P2 unless real mobile performance fails release gate.

First observed: earlier audit; updated 2026-09-22.

Affected area: loading, AI costs, maintenance.

### Problem
Builder chunk 1,616.33 kB minified/538.51 kB gzip; shared checker-audit chunk 1,017.81/284.10 kB. Several shipped static PNGs ~2 MB. Merged AI mode duplicates CV text and discards extraction output.

### Evidence
Build log; public asset sizes; merged-call.ts and cruise-cv-check.ts. Parsing libraries imported statically in extractCvText, Tesseract lazy. Server-heavy modules reach client graph via shared exports/stub; do not infer exposed secrets from chunk size.

### Reproduction
Build and measure route network waterfall on slow mobile; no Lighthouse score claimed.

### Likely cause
Import granularity and accumulated builder scope.

### Current workaround
Route-level code splitting exists; avoid extra model calls.

### Recommended fix
Measure then lazy-load heavy optional functionality; optimize active images; resolve merged mode intent before enabling.

### Related files
vite.config.ts, src/routes/builder.tsx, src/lib/extractCvText.ts, src/lib/ai/merged-call.ts, public/images.

## ISSUE-016 — Cache and model failure contracts incomplete

Status: OPEN.

Severity: P1

First observed: 2026-09-22.

Affected area: F003 runtime reliability.

### Problem
Cache read casts JSON without schema validation; provider construction can fail before degraded fallback; nested retry budgets exceed client timeout; no request cancellation; detached KV writes may not finish.

### Evidence
getCachedResult, createRouter placement, Promise.race in checker, void setCachedResult/telemetry calls. Workers AI ignores signal; merged structural errors bypass retry.

### Reproduction
Mock invalid cache record, missing key, provider stalls/429 and malformed merged output; assert safe failure and bounded call count.

### Likely cause
Separate mechanisms added without a shared final report/deadline contract.

### Current workaround
Public free path avoids AI availability but still reads cache.

### Recommended fix
Validate final/cache report, persist semantic versions, bound whole operation, use supported request lifetime for background writes and recover clearly.

### Related files
src/lib/kv-cache.ts, src/lib/cruise-cv-check.ts, src/lib/ai/router.ts, src/routes/tools/cruise-cv-checker.tsx.
