# Development session — 2026-09-23 / 01

## Scope and authority

ISSUE-017 only: redacted repository investigation and incident documentation. Read AGENTS.md, GET_HIRED_PRODUCT_SPEC.md, PROJECT_STATUS, KNOWN_ISSUES, ARCHITECTURE, TECH_STACK, ROADMAP, DECISIONS, SESSION_INDEX and both most recent relevant journals. Product authority remains the existing specification. No other issue was worked on.

## Starting state and preservation

Branch main; HEAD d84292a46c8782c566f38f5e44dacf00d0640294. Dirty working tree, with no staged changes. Existing edits included .gitignore, agent/vexp configuration, package manifest/lock and cleanup deletions, AppHeader, auth/save/import/builder/checker code, vite configuration, generated-test deletions, untracked save tests/modules, specification and documentation. All were preserved; no reset, checkout, staging, commit, deletion or deployment.

A temporary local SHA-256 inventory captured existing tracked/nonignored file bytes and tracked deletions before documentation edits. Final comparison is restricted to this session's four documentation paths; unrelated bytes/deletions must remain unchanged. Ignored local environment contents were not inspected or modified.

## Evidence and results

- Original audit labels: ANTHROPIC_API_KEY and SUPABASE_SERVICE_ROLE_KEY. Independent in-memory inspection found a Groq-shaped value under the Anthropic label and a JWT-shaped value with an unverified service_role payload claim. No historical credential was authenticated or tested.
- First-known .env evidence: 95eca08 on 2026-06-12, blob 0367b060e02f; later 3f73806, blob 79087d856367. Removal trees c9b7500 and 2cfe130 contain no .env. Historical exposure remains reachable.
- Historical assignment inventory also includes GOOGLE_SHEETS_LEAD_WEBHOOK_URL, VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY. Webhook access policy is unknown; the URL is potentially sensitive. Public Supabase client settings are distinguished from the privileged credential.
- Captured Git plumbing scan: 844 reachable blobs, including binaries; recognizable credential patterns matched only the two historical .env blobs. Starting current inventory: 390 paths, 343 existing files, 47 pre-existing tracked deletions. Zero current-file or index pattern matches. Separate byte comparisons found no exact historical value for any of the five variables in current files.
- Patterns covered common provider keys, JWTs, private-key headers and credential-bearing URLs. This is bounded evidence, not an exhaustive proof for arbitrary encodings, compressed content, ignored files, remote-only history or provider stores.
- git check-ignore --no-index verified .env, .env.local, .env.production, .env.production.local, nested .env/.env.staging and .dev.vars protection; .env.example is intentionally included. .dev.vars.production is not ignored. Existing .gitignore was preserved under the audit-only documentation scope; variant coverage remains a concrete containment follow-up.
- Current service-role use traced to getLeadDb / persistCvLead / persistLeadJourney. ANTHROPIC_API_KEY has no current source/deployment consumer. GROQ_API_KEY is used by the AI router, builder assistance and parser paths; deployment value reuse is unknown.
- Reviewed GitHub deployment workflow, both Wrangler configurations, environment template and operations references. CI copies GROQ_API_KEY, SUPABASE_SERVICE_ROLE_KEY and GOOGLE_SHEETS_LEAD_WEBHOOK_URL from GitHub Secrets to Worker secrets after deployment. GitHub and Worker values must both be replaced to avoid reintroduction. No provider/dashboard configuration was inspected.
- All historical values stayed in captured process memory; outputs contain only metadata/classifications. No secret was printed, echoed, included in arguments, stored in journals or used for network calls. No new tools or dependencies installed.

## Changes

Expanded the existing ISSUE-017 entry in KNOWN_ISSUES.md into the canonical incident record instead of adding a duplicate. Updated PROJECT_STATUS.md and SESSION_INDEX.md; created this journal. The incident separates repository evidence from owner verification, supplies provider/deployment evidence fields, defers history cleanup and defines exact closure conditions.

ROADMAP and DECISIONS unchanged: security prerequisite remains blocked and existing ordering/ADR-002 remains applicable. No new architectural/security policy decision or history-cleanup approval was made.

## Verification method and limitations

Native Git/Python checks only: git status, branch/HEAD, ls-files, rev-list --objects --all, captured cat-file/show, ls-tree, log metadata, check-ignore, variable-name-only searches and narrow configuration/code review. vexp run_pipeline/verify_done tools were unavailable; named documentation scope and native checks used instead. No UI, unit, build or production tests were appropriate to this documentation-only security verification.

Final verification passed: 344 existing tracked/nonignored files scanned after adding this journal, zero credential-pattern matches; local Markdown links and UTF-8 checks passed. Snapshot comparison found exactly the four documented Markdown changes and no unrelated modifications or new deletions. HEAD remained unchanged and the staged-path count remained zero.

Used the Supabase skill for credential-specific guidance and read the official [API-key documentation](https://supabase.com/docs/guides/getting-started/api-keys). The changelog markdown fetch was unsupported by the web reader; no provider implementation was attempted. Creating a replacement is not evidence of invalidating an old legacy key. No online search included repository credentials or identifiers.

## Outcome and next task

ISSUE-017 is **OPEN — CURRENT SOURCE SCAN CLEAR / PROVIDER ROTATION PENDING / IGNORE GAP OPEN**. Provider invalidation, usage/access review and deployment replacement are **BLOCKED ON OWNER**, with no evidence received. Release 0.1 remains NOT READY.

Next exact task: continue ISSUE-017 containment by adding/verifying .dev.vars.* ignore coverage without disturbing existing edits, then record owner-provided invalidation evidence for the mislabeled Groq value and Supabase service-role value, resolve webhook exposure and verify secure replacement across all consumers. History cleanup requires a separate explicit post-revocation decision. Do not begin ISSUE-001 or any product work as part of this session.
