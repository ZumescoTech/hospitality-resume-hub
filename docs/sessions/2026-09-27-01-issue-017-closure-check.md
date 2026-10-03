# Session journal — ISSUE-017 closure check

## Scope

ISSUE-017 only. Owner confirmed affected credentials were rotated/replaced.
No secret values were read, printed, or modified. ISSUE-001 was not started.

## Repository verification

- `git check-ignore -v --no-index` confirms `.env`, `.env.*`, `.dev.vars`,
  `.dev.vars.production`, and `.dev.vars.staging` are ignored. The existing
  `.dev.vars.*` rule covers additional environment variants.
- Tracked secret-like path check found only `.env.example`, the intentional
  safe example file. Its credential-shaped markers were placeholder values.
- The deployment workflow wires `GROQ_API_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, and `GOOGLE_SHEETS_LEAD_WEBHOOK_URL` from
  GitHub Actions secrets to the production Worker. This source wiring does
  not prove the current values or replacement deployment. No equivalent
  runtime secret values are checked into Wrangler configuration.
- Repository evidence does not include provider access logs, usage review,
  webhook access policy, GitHub secret values, Cloudflare Worker secret
  values, or deployment verification. These cannot be verified from this
  checkout.

## Git-history decision

At the owner's direction in this request (2026-09-27), do not rewrite Git
history. Preserve existing history; rotated credentials do not make historical
copies disappear. This is a decision against history rewriting, not a claim
that historical blobs have been erased or that the repository is clean of all
historical credential material.

## Remaining closure evidence

ISSUE-017 remains OPEN until the owner records, without secret values:

1. The disposition of the historical Google Sheets webhook: invalidated or
   restricted, or evidence-based confirmation it was non-sensitive; include
   whether the deployed replacement is active.
2. A provider/database/webhook access and usage review from the known exposure
   period through invalidation, including unavailable retention intervals and
   any findings.
3. Confirmation that the replacement configuration is present in GitHub
   Actions, the applicable production/staging Worker environments, local
   developer configuration, and any other affected consumers; include
   deployment/synthetic verification references.

The general rotation confirmation does not establish these repository-external
checks. No project-status or canonical issue-state change is made while they
remain unverified.

## Checks and outcome

- Ignore coverage: passed.
- Tracked secret-path and placeholder-only configuration check: passed.
- Provider/store/access-log verification: unavailable from repository evidence.
- No application tests or build run; this was a documentation and configuration
  metadata verification only.
- No commit or integration performed.

## Superseding outcome

This intermediate check was superseded later on 2026-09-27 after the owner
confirmed the historical webhook is unused, the access/usage review found no
suspicious activity, and all affected credentials were replaced. The active
webhook integration was removed, the no-history-rewrite decision was
documented, and ISSUE-017 was closed. See
[2026-09-27-02-issue-017-closed.md](2026-09-27-02-issue-017-closed.md).
