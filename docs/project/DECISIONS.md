# Decisions and observed architecture

Only ADR-001/002 record decisions made in this audit. Other entries describe code/history, not invented owner approval.

## ADR-001 — Preserve the skeleton and adopt specification-led continuity

Date: 2026-09-22

Status: Accepted for this audit, explicitly instructed by owner.

### Context
Existing working functionality, uncommitted save recovery and historical plans coexist with a new narrower Release 0.1 spec.

### Decision
GET_HIRED_PRODUCT_SPEC.md is authoritative. Create project/status/testing/session documentation; preserve product code and historical notes. Future sessions read spec/status/index/relevant session/issues first and journal changes before completion.

### Why
Enable reliable incremental work without relying on conversation history.

### Alternatives considered
Rewrite, blanket cleanup, or another duplicate product specification; rejected as contrary to scope.

### Consequences
Working tree remains dirty; cleanup and fixes require separate work. Old plans are reference material.

## ADR-002 — Block release pending safety and evidence

Date: 2026-09-22

Status: Audit recommendation; not release approval.

### Context
Historical credential exposure, critical dependency advisory, broken dashboard, missing report continuity and unverified RLS/replay controls.

### Decision
Readiness is NOT READY. Prioritize historical credential containment, then critical dependency remediation before normal feature order.

### Why
Spec §21/32 permits release-blocking dependencies to precede F-001 work.

### Alternatives considered
Label closed beta based on unit counts or successful build; rejected because these do not prove applicant safety.

### Consequences
Use synthetic local testing until real-user gates pass. Do not promote traffic based on this audit.

## ADR-003 — Public checker uses deterministic scoring

Date: observed 2026-09-22; historical commit date not inferred.

Status: Existing implementation, evidenced by 2aaddc7 and 36ba1e0.

### Context
Repository retains AI providers and a paid branch while publicCruiseCvCheckData selects free.

### Decision
Record localEngine as current public path; preserve provider layer because builder import/assistance still uses it.

### Why
Commit messages and tests explicitly describe zero-AI free scoring. Broader business rationale is not established.

### Alternatives considered
Historical AI analysis path remains in code; no new provider selection decision made here.

### Consequences
No claim that public scores are LLM reviews. Improve deterministic explanations/truth safeguards and test relevance before considering more model calls.

## ADR-004 — Browser parsing, local recovery and Supabase/CRM boundaries

Date: observed 2026-09-22.

Status: Existing architecture; retention and database-policy decisions unresolved.

### Context
PDF.js/Mammoth/OCR parse browser files. Builder uses local recovery and optional Supabase. Lead migration explicitly isolates CRM from a separate members table.

### Decision
Document existing choices without asserting they were approved for current Release 0.1. No raw binary storage service found; raw text localStorage has no expiry. CRM uses service role, auth/CV browser uses anon key.

### Why
Source and migration prove behavior, not production policy or consent.

### Alternatives considered
Unknown historical parser/auth/provider selection rationale: PURPOSE UNKNOWN — REQUIRES OWNER REVIEW where needed.

### Consequences
Retain current modules. Decide retention, anonymized fixtures, analysis schema, RLS and analytics masking in explicit future ADRs; no migration during audit.
