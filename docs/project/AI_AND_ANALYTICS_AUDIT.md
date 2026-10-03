# AI, scoring and measurement audit

2026-09-22. Read alongside [feature gaps](PRODUCT_GAP_ANALYSIS.md).

## Actual analysis behavior

The normal checker explicitly sends tier=free; localEngine uses deterministic structural signals, keyword matches, experience proxies and role-conditional weights. It does not call a model. Server code still defaults an omitted tier to paid and allows callers to select it. Paid is a code branch, not verified billing or entitlement.

Role input comes from cruise-roles.json. Deterministic checks include word count, section/contact/summary detection, quantified lines, dates/estimated years, garbling and keyword match. Sommelier has different qualification/cruise weights and WSET/CMS gate. Two extra precheck termbanks cover cabin steward/youth staff; they do not replace the 15-role registry. Confidence is a heuristic, not empirically calibrated probability. Public category prose is overwritten with the same generic local-engine sentence; major contextual interpretation is missing.

## Model and prompt inventory

| Path | Configuration | Output/validation | Calls and failure |
|---|---|---|---|
| Paid scoring, GroqAdapter | llama-3.3-70b-versatile; temp .1; 1500 output tokens | Seven scored category objects and topFixes; provider.ts Zod bounds 0–100 | Shared Groq transport; router bad-JSON retry then fallback |
| GeminiAdapter | gemini-2.5-flash; temp .1; JSON MIME; 1500 analysis/2500 extraction/3000 raw | Same provider schemas | 20s fetch timeout; system and user concatenated into one contents message |
| WorkersAiAdapter | @cf/meta/llama-3.3-70b-instruct-fp8-fast | Same schemas | Flagged third provider; ignores caller abort; no explicit timeout |
| Structured extraction | extract-prompt.ts; Groq temp 0, 2500 tokens | ResumeData Zod; deterministic field overlay; generated IDs | Input sliced to 8000 chars in adapters; no surfaced truncation warning |
| Grammar | builder-assist.ts CHECK_WRITING_SYSTEM; Groq temp 0, 400 tokens | JSON array filtered by field types | 4s budget, zero retries; any error returns [] |
| Tailoring | TAILOR_SYSTEM_BASE + role-patterns.ts; temp .3, 800 tokens | JSON parsed; rewritten string / string skills checked, no evidence validation | Invalid JSON returns original text and empty skills; provider errors surface |
| MERGED_CALL | Analysis + extraction prompts; CV duplicated in user payload | mergedResultSchema | Router raw transport then validation; extracted resumeData discarded by check caller |

Scoring prompt is embedded in cruiseCvRubric.ts, extraction in ai/extract-prompt.ts, tailoring/grammar in ai/builder-assist.ts, pattern guidance in ai/role-patterns.ts and data/hospitality-patterns.json. ai/phrasing-chips.ts is deterministic builder suggestion support. Prompts are distributed by responsibility, but there is no coherent prompt-version/result-version record. Old parseCvCheckResponse remains test-referenced; adapters use provider.ts validators instead. Keep it pending test/consumer cleanup, not as a second production authority.

Groq 429 transport retries use 1/3/8-second delays, capped retry-after 15 seconds, 20-second fetch deadline per attempt. Router may retry primary on bad JSON and then fallback; if Gemini key is missing fallback is another GroqAdapter. WORKERS_AI_ENABLED adds nested fallback, so total wall time may exceed the UI's 35-second race. Timeouts protect fetch response arrival, not necessarily the entire parsing/body pipeline. No end-to-end request budget/cancellation exists.

## Direct answers to trust questions

**Does it prevent invented candidate experience?** Not comprehensively. Extraction and tailoring prompts say not to invent, and tailoring uses bracketed number placeholders. Type validation cannot establish truth. The paid analysis prompt lacks an equally explicit complete evidence/no-fabrication contract. Deterministic suggestions can instruct users to add missing skills or credentials without “if true.” No launch hallucination suite proves zero fabricated facts.

**Does role selection matter?** Yes for keyword findings, precheck mapping, sommelier weighting, paid role prompt and builder pattern family. The free explanations are mostly generic and the required semantic relevance threshold is unmeasured.

**Can CV text override instructions?** No instruction-following model exists in the public free path; keyword gaming remains possible. Paid/builder text is interpolated with quotes, not an enforceable trust boundary. Gemini combines policy and CV in one message. No adversarial evidence proves resistance; do not claim safety merely because a prompt says “never invent.”

**Is output validated before display?** Groq/Gemini/Workers analysis/extraction use Zod. Cached CvScoreResult is JSON.parse + cast; local/report boundaries are types, not a validated complete report schema. Tailoring uses limited type filtering. Evidence accuracy is never schema-validated.

**Invalid JSON?** ProviderError bad_json → bounded retry/fallback. Exhaustion yields marked deterministic degraded scoring on the paid normal route. Missing Groq configuration throws before that catch. Merged JSON validation is outside router retry. Grammar returns no suggestions, tailoring silently returns unchanged input; these can look like successful no-op processing.

**Are failures visible/recoverable?** Checker toasts, parse-failure cards and retry exist. Builder tailoring reports transport failures; grammar deliberately hides them. Report reload/save is not recoverable without rescoring. UI timeout does not cancel upstream work; errors may expose internal configuration/provider text.

**Duplicate model work?** Public free score: zero. Direct builder import normally uses AI even where deterministic parsing exists (HYBRID_EXTRACTION off). Router can use same Groq provider twice if Gemini missing. Merged mode sends CV twice and discards extracted resume data; it does not remove the later builder call. Recheck can repeat work if fire-and-forget cache did not complete. No accidental initial duplicate public model call was found.

**Versioning?** SCORING_VERSION='3' in cache key; handoff schema v1 and local persistence v2. None substitutes for persisted parser_version, role_profile_version, analysis_version and report_schema_version. Cache does not incorporate all feature flags/model settings; bump version for material semantics.

## Analytics event audit

IMPLEMENTED below requires a callsite, not just a name in documentation. All Clarity events are gated on project ID; external delivery/configuration unknown. PARTIAL includes an alternate name or incomplete stage semantics.

| Spec event | Status | Actual evidence |
|---|---|---|
| landing_viewed | MISSING | No callsite |
| role_selector_viewed | MISSING | No callsite |
| role_selected | MISSING | handleRoleChange only sets state |
| custom_role_entered | MISSING | No custom flow |
| cv_upload_started | IMPLEMENTED | checker handleFileChange, only after size acceptance |
| cv_upload_completed | PARTIAL | cv_upload_succeeded occurs after scoring, not upload |
| cv_upload_rejected | PARTIAL | oversized diagnostic / cv_upload_failed; no canonical event |
| cv_parse_started | MISSING | Progress only |
| cv_parse_success | MISSING | No distinct parse event |
| cv_parse_failed | PARTIAL | Quality-failure callsite exists but name absent from ClarityEvent type; TS error |
| analysis_started | MISSING | No canonical event |
| analysis_completed | PARTIAL | KV scored counters; cache hits omitted |
| analysis_failed | PARTIAL | Provider counters / upload_failed conflate stages |
| report_viewed | PARTIAL | score_viewed on response, not validated report view |
| recommendation_expanded | MISSING | Category toggles do not record engagement |
| recommendation_action_started | MISSING | builder_entered is not recommendation-specific |
| signup_started | MISSING | Auth pages lack instrumentation |
| signup_completed | MISSING | Auth pages lack instrumentation |
| report_saved | MISSING | No saved report |
| feedback_submitted | MISSING | No feedback |

Additional actual events: builder_entered, export_triggered, export_succeeded, export_failed. trackEvent accepts a name only, so role/profile/parser/analysis/report version, file-size bucket, session/user and failure-code properties are absent. SESSION_ID in checker diagnostics is module-level rather than a durable journey session. CRM journey timestamps are not a substitute for anonymous activation analytics.

## Privacy/security of measurement

Clarity custom events contain only names: no direct CV PII payload found. However session replay is initialized globally on report/builder/auth; masks rely on external project configuration, not explicit masking of rendered CVs. This is an unresolved P0 verification gate. Do not assert leakage was observed.

Routine AI router logs only provider, outcome and timing. Checker browser errors and public logUploadFailure carry arbitrary message/stack strings. Such strings can include PII from parser/provider diagnostics or direct caller input; no redaction/allowlist is enforced. getUploadFailures exposes recentEntries without staff auth. CRM event payload can include full_name; CRM and general analytics must remain separate with documented consent/retention.

KV counters race under concurrency, cache hits bypass counts, latency measures server scoring rather than true upload-to-value, and score 100 is recorded in a bucket the reader does not display. Avoid relying on the existing metrics for launch targets until these semantics are corrected.
