# Release 0.1 feature audit

2026-09-22. Authority: [spec sections 7–13](../../GET_HIRED_PRODUCT_SPEC.md). WORKING means supported by source and the cited tests, not production approval. PARTIAL means some behavior exists; BROKEN means a demonstrated defect; UNUSED means no active consumer; EXPERIMENTAL means gated alternative; UNKNOWN means insufficient evidence.

Engineering coverage below uses **feature release-gate checkboxes**, one point for implemented with relevant evidence, half for partial implementation, zero for missing/broken/unknown. It is not a product-quality score or a launch pass. Static evidence does not satisfy manual quality gates. The tables enumerate each gate in specification order. No feature is DONE.

## F-001 — Target Cruise Role — PARTIAL — 4/11 = 36%

Already working: choose one supported role; role slug persists in draft and reaches the scorer; changing selection updates context; JD optional; unknown slug throws rather than silently mapping to another job. R01/R02/R06/R07/R08/R10 have code support.

Partially working: each of 15 dropdown entries has a central profile, but no profile version/supportLevel and multiple separate role-family/termbank maps exist (R03). Same CV changes keyword findings and sommelier weighting (R09); specialist relevance is not validated by the 50-case manual matrix.

Missing: custom entry and limited-coverage messaging (R04/R05); role events and per-analysis role version. Current roles combine Waiter/Waitress, Bartender/Bar Waiter and guest services; assistant waiter, barista, restaurant supervisor and housekeeping supervisor are not separate profiles. Photography, spa and youth roles expand beyond the intended initial set.

Broken: no observed supported selection crash. Product copy claims 13 roles while registry has 15. Unsupported roles cannot enter the requested custom flow.

Unknown: all-role mobile/desktop interactions, browser forward restoration and manual relevance/fabrication gate.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| Mobile role selection | .5 | 390px waiter exercised; full matrix absent |
| Desktop selection | .5 | E2E selector visibility; every-role interaction absent |
| One active profile each | .5 | Unique current slugs; no active/version contract |
| Custom role | 0 | Missing |
| Unsupported limitation | 0 | Missing |
| Role reaches engine | 1 | public-checker-free-tier; free-no-ai; browser waiter |
| Different-role analysis | .5 | local-engine-every-role; no human semantic matrix |
| Role analytics | 0 | No metadata API |
| 50-analysis matrix | 0 | No completed evidence |
| Zero fabricated facts in test set | 0 | No completed launch matrix |
| Error recovery | 1 | Form retained; retry/reselect supported |

Main files: cruise-roles.json, cruise-role-options.ts, checker route, cruise-cv-check.ts, localEngine.ts, precheck/wiring.ts.

## F-002 — CV Upload & Parsing — PARTIAL — 4.5/12 = 38%

Already working: PDF.js, Mammoth DOCX and TXT dispatch; 5 MB checker guard; unsupported/legacy/corrupt errors; text minimum; server parse quality gate; paste fallback. Raw document binary is not sent to a storage bucket. R01/R02/R03/R06/R07 have partial-to-substantial source coverage.

Partially working: extraction returns a bare string, not a validated ParseResult. PDF text joins tokens by spaces rather than reconstructing column reading order; OCR reads only first three pages and does not warn on omitted pages. DOCX warnings are discarded. Bad/empty output rejected, but parser version/quality warnings are absent. R04/R05/R08 remain incomplete. Parser helper does not independently enforce file bytes and server text is unbounded.

Missing: parser_version (R09); 30+ representative binary fixtures, multilingual/layout QA, whole-parser deadline and cancellation. R10: named events do not carry raw CV text, but Clarity replay masking/log payload safety is unverified.

Broken: OCR timeout races without terminating work on timeout; timeout starts after worker creation. Partial OCR success can silently omit later pages. Generic error messages/stack flow into public diagnostic storage. These are code findings; no live OCR stress test was run.

Unknown: ≥95% supported fixture success, real scanned/multi-column accuracy, Safari fake-worker fallback and phone memory limits.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| PDF happy path | .5 | Adapter/tests exist; current audit did not run full binary fixture journey |
| DOCX happy path | .5 | Mammoth/tests; no real DOCX fixture set found |
| Max size | 1 | Checker guard, 5 MB |
| Unsupported error | 1 | ExtractionError and edge tests |
| Empty/corrupt rejected | .5 | Mock/quality tests, incomplete binary matrix |
| Image-only cannot fake success | .5 | OCR/length gates; truncation risk |
| Multi-column manual review | 0 | Absent evidence |
| Parse result schema | 0 | String only |
| Invalid result stops analysis | .5 | Minimum/quality gates; no complete parser contract |
| Parser version stored | 0 | Missing |
| PII logs/analytics inspection | 0 | Replay settings and arbitrary diagnostics unresolved |
| ≥95% fixture success | 0 | Unmeasured |

Main files: extractCvText.ts, extraction-error.ts, cvDeterministicChecks.ts, checker route, parseCvForBuilder.ts.

## F-003 — Cruise CV Analysis Engine — PARTIAL — 4/11 = 36%

Already working: deterministic objective checks; role-keyword scoring; weighted scores bounded 0–100; provider-layer Zod schemas and retry/failover; public free scorer independent of AI keys. Local scoring is a valid foundation, not a reason to rebuild.

Partially working: public category feedback is the same LOCAL_FEEDBACK sentence in all seven categories. Missing keywords are distinguished from matches, but major findings lack evidence spans, evidenceState and stable issue IDs. SCORING_VERSION='3' salts cache but is absent from result records; no parser/profile/report version chain. Paid failure uses marked deterministic degraded output rather than invented AI prose, but not all provider failures take this path.

Missing: complete evidence/gap/risk/action contract; semantic truth checks; no-fabrication/prompt-injection launch matrix; versioned saved analyses.

Broken: shared cache JSON is cast, not validated. AI factory throws on missing Groq key before exhaustion catch. Merged mode validates after router returns, so malformed merged JSON does not get normal structural retry. No application quota/entitlement protects caller-selected paid tier.

Unknown: live provider availability, factual quality and repeated-run semantic consistency. Public deterministic output has no LLM instruction channel but can reward keyword stuffing/negated claims; it is not proof of prompt-injection safety for builder/paid paths.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| Structured output schema | 1 | provider.ts |
| Schema enforced | .5 | AI adapters yes; cached/final local boundary no |
| Malformed output not successful | .5 | Provider tests; cache cast/merged gaps |
| No fabricated facts launch set | 0 | No completed matrix |
| Injection fixtures safe | 0 | Missing adversarial proof |
| Role context affects analysis | .5 | Deterministic tests; generic explanations |
| Evidence vs absent evidence | .5 | Keywords only; no evidence contract |
| Score bounds | 1 | Clamped scorer + schema/tests |
| Analysis version persisted | 0 | Cache salt only |
| Recoverable failures | 0 | Partial UI retry, missing-key/deadline/error boundary gaps prevent gate |
| Findings manually traceable | 0 | No completed review |

Main files: localEngine.ts, cruiseCvRubric.ts, cvFeedback.ts, ai/provider.ts, ai/router.ts, kv-cache.ts.

## F-004 — Prioritised Fixes — PARTIAL — 2.5/8 = 31%

Already working: two primary fixes before details, indexed priority and separate secondary feedback. Spec allows 1–3; showing two is not itself a defect.

Partially working: deterministic order is contact/summary/length/metrics then missing keywords, not a validated per-role impact ranking. Actions are strings and omit consistent why/evidence/next-action structure.

Missing: evidence state, issue IDs, engagement tracking, human actionability testing.

Broken: genericSuggestion says add a missing keyword as a requirement without checking that the candidate has that experience; Opera PMS/STCW/WSET and numeric examples are insufficiently truth-qualified. Browser waiter test produced “Add 4-star” despite no such evidence. No invented fact was inserted into the CV during this audit, but the guidance encourages unsupported claims and fails the truth rule.

Unknown: ≥80% actionability and 4/5 testers identifying first action within 30 seconds.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| 1–3 fixes | 1 | slice(0,2), AtsScoreRing |
| Ordered priority | .5 | Static heuristic order |
| Why matters | .5 | Some strings explain; not consistent |
| Evidence state | 0 | Missing |
| Actionable step | .5 | Concrete strings, uneven relevance |
| No fabrication instruction | 0 | Violated |
| Secondary not overwhelming | 0 | WhatsApp gates detail; no usability proof |
| Engagement analytics | 0 | Missing |

Main files: cvFeedback.ts, localEngine.ts, AtsScoreRing.tsx, checker-audit.ts, ImprovementChecklist.tsx.

## F-005 — Report Experience — PARTIAL — 4/9 = 44%

Already working: selected role, labeled score/tier, visible primary fixes, reduced-motion-aware score animation; category rows and matched/missing keyword lists. 390px synthetic report had no horizontal overflow. Error/retry states exist.

Partially working: score labeled ATS without adequate calibration explanation; category contribution weights display correctly from result, but free feedback is generic. Score accessible name reflects final score while animation is in progress (screenshot was captured mid-animation). Detail requires WhatsApp capture or skip. Keyboard/contrast not fully audited.

Missing: durable report state/ID, appropriate once-only report event, full evidence hierarchy and signup/save/feedback CTA.

Broken: reload loses report; backward step clears result and forward cannot recover it. Homepage fear-based ATS wording and “application-ready” score bands overstate what was tested. The unused tierSummary constant includes even stronger rejection copy but is not currently rendered.

Unknown: real device/Safari, contrast/screen-reader and 5-user comprehension gates.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| Mobile usable | .5 | Single 390px report inspection |
| Top fixes visible | 1 | Browser + source |
| Score meaning | 0 | ATS validity not explained |
| Role visible | 1 | Browser waiter heading |
| Error/retry | .5 | Exists; report recovery missing |
| Keyboard key controls | .5 | Native/Radix controls; full pass missing |
| Visible focus | .5 | CSS classes present; full pass missing |
| No color-only status | 0 | Labels exist, whole-flow audit incomplete |
| report_viewed once | 0 | Alternate event, no canonical semantics |

Main files: checker route, AtsScoreRing.tsx, UploadProgressBar.tsx, index.tsx, styles.css.

## F-006 — Account / Save Report — BROKEN/PARTIAL — 1/7 = 14%

Already working: anonymous first value; email/Google auth UI; builder local recovery/cloud adapter; owner-scoped local keys and cloud query filters. New save controller is pre-existing uncommitted work, not implemented by this audit.

Partially working: builder CV persistence is not saved-analysis persistence. Anonymous draft inheritance exists for a new account document but not a guaranteed report signup handoff. Auth failures have toasts; mocked account saving is not proof of RLS.

Missing: report signup entry/analysis ID/persistence/retrieval; auth return destination; signup/save events; checked-in resumes DDL and ownership tests.

Broken: /dashboard runtime throws No QueryClient set; hooks follow a conditional return; Edit/New links target home; report disappears on reload/navigation. Nullable Supabase calls also fail when config missing.

Unknown: deployed auth redirects/email confirmation/Google settings; real owner retrieval and cross-user read/write/delete policies.

| Gate | Credit | Evidence/gap |
|---|---:|---|
| Signup from report | 0 | Missing |
| Signup preserves report | 0 | No persisted result |
| Owner retrieves report | 0 | No saved-analysis entity |
| Cross-user access blocked | 0 | RLS unverified |
| Auth failure recovery | .5 | Toasts; return flow absent |
| Signup/save analytics | 0 | Missing |
| No private data in URLs | .5 | No report URL; full provider/deployment review absent |

Main files: sign-in/up.tsx, dashboard.tsx, resume-store.ts, resume-persistence.ts, cv-import-handoff.ts.

## F-007 — Feedback Capture — MISSING — 0/6 = 0%

Already working: none for usefulness feedback. cvFeedback.ts generates advice; CRM consent/events are not user feedback.

Partially working: none of the requested feedback flow.

Missing: Yes/Partly/No, optional comment, analysis link/version/role, persistence, duplicate control, nonblocking failure UI and feedback_submitted.

Broken: no implementation exists to classify as runtime-broken.

Unknown: usefulness and beta signal cannot be measured.

All six release gates (post-value control, persistence, optional comment, spam control, role/version association, nonbreaking submission failure) score 0. Add only after the analysis identity/persistence contract is reliable.

## Remaining feature inventory

| Feature | Status | Main files | Works / does not / spec |
|---|---|---|---|
| Landing | PARTIAL | index, HeroBanner | Navigation works; misleading ATS/account copy; §4/11 |
| Builder and templates | WORKING in local covered paths | builder; template registry; lib/pdf | Seven previews, edits, PDF engine; export E2E stale, visual export matrix unknown; later scope |
| Direct builder import | PARTIAL | parseCvForBuilder | AI extraction with optional hybrid; live provider unknown; later scope |
| Writing/tailoring | PARTIAL | ai/builder-assist | Prompt safeguards and user actions; semantic validation missing; later scope |
| OCR | PARTIAL | extractCvText | Lazy English first-three-page fallback; truncation/cancel risk; F002 |
| Paid checker | UNUSED by public UI | cruise-cv-check; ai/router | Still caller-reachable, cannot delete as dead code; F003 alternative |
| Workers AI / merged / hybrid / enrichment | EXPERIMENTAL | ai; parseCvForBuilder | Flags default off; retain tests; F003/later |
| Lead capture | PARTIAL | WhatsAppCaptureForm; leads | Consent UI + CRM schema; false success/unauthorized update; not F007 |
| Metrics | PARTIAL | telemetry; metrics-api; metrics route | Aggregates/diagnostics; public access, race losses; §5 |
| UI scaffolds | UNUSED | cleanup ledger | No active imports for listed candidates; not requirements |
| Mobile/accessibility | PARTIAL | route/UI CSS | Some responsive behavior verified; Field label linkage absent; §11 |
| Privacy/security | PARTIAL | persistence/RPC/config | No binary CV upload; RLS/replay unverified, endpoint risks; §17 |
