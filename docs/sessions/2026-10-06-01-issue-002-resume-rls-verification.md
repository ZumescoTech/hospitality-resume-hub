# ISSUE-002 — Resume RLS verification

Date: 2026-10-06. Final status: **CLOSED for the assigned resume database scope, locally verified**. Release 0.1 remains **NOT READY**. No hosted database mutation, deployment, merge or push.

## Task and starting state

Continue the unfinished six-column resume migration and prove authenticated owner behavior plus cross-user/signed-out isolation. Branch `agents/issue-002-resume-rls`, HEAD `d5de2d1f8e24a93792ec99ad47442df9a76989e1`; no branch commits beyond main and nothing staged at entry.

Existing tracked changes: PROJECT_STATUS, KNOWN_ISSUES, SESSION_INDEX, RELEASE_CHECKLIST and `src/routeTree.gen.ts`. Existing untracked work: October 4 ownership journal, October 5 contract journal, local Supabase config/ignore, resume migration, pgTAP schema test and Data API isolation script. All were inspected and preserved. The unrelated generated route tree remained byte-identical (SHA256 `0686bbdbdc6b1c2b20c0c0fb5b3c466f8faf8cde54d33c29951a6a442693942d`) and is excluded from the commit.

Required documents were read in the requested order except `GET_HIRED_PRODUCT_SPEC.md`, which was initially absent. On the owner's request to recheck it appeared as an untracked file and was read, including sections 9.7, 12, 15–17, 19–21 and 30–33. Its broader analysis/account requirements remain separate; the supplied specification is preserved without edits and excluded from this focused commit.

## Implementation and review

Retained the existing migration and local configuration. Six required non-null columns: UUID primary key `id`; UUID `user_id` referencing Auth; text `title`; object-only JSONB `data`; text `template_id`; timestamptz `updated_at`. Multiple resumes per owner are supported. Owner/latest index is `(user_id, updated_at DESC)`.

Four authenticated policies use `(select auth.uid()) = user_id`; UPDATE checks both existing and resulting ownership. Explicit revocation removes PUBLIC, anon, authenticated and service-role default table privileges before granting authenticated CRUD only. The timestamp trigger is SECURITY INVOKER with fixed `pg_catalog` search path and no client EXECUTE; it runs before INSERT/UPDATE, including conflict upsert. No unrelated table/policy changes or privileged resume RPC.

Owner explicitly confirmed retaining **ON DELETE CASCADE**. A temporary conservative NO ACTION edit was superseded by that instruction; the final migration retains its original cascade behavior. No account-deletion feature was added. ADR-005 records the confirmed FK choice without changing historical evidence.

Strengthened pgTAP with effective client bypass/MAINTAIN/PUBLIC/grant-option and trigger/FK checks. Strengthened REST tests with authenticated partial `{}` drafts, explicit known-ID round trips, runtime Anonymous Auth configuration, genuinely signed-out requests without Authorization, and owner-session cleanup of only this run's known fixture IDs. Formatted only the new JS test script. No application code or dependency changes.

A second read-only reviewer checked RLS bypass, grants, ownership reassignment, upserts, service-role exposure, client-filter reliance, zero-row false positives and scope. No implementation/security blockers remained. Vexp `verify_done` was unavailable in the exposed tool inventory; native diff/client-path review and repository-prescribed tests were used.

## Environment and reproducibility

Docker 29.6.1 and Supabase CLI 2.100.1 available. Initial sandbox Docker/CLI permission errors were resolved through approved escalation; they were setup restrictions, not product failures. Dedicated local project: `gethired-issue002-local`, API `http://127.0.0.1:55431`, database port 55432, PostgreSQL major 17. No linked/hosted target was used. Before reset, Auth users, resumes and both CRM tables had zero rows.

`supabase db reset --local --no-seed --yes` recreated the database and applied both the existing CRM migration `20260826` and resume migration `20261005121313`. The CLI's “branch main” message is its database branch label, not a Git checkout change. Migration list with `--local` matched both versions; its “Remote” display column refers to the selected local database. Final tests run after replaying the owner-confirmed cascade migration.

Runtime `/auth/v1/settings` confirmed Anonymous Auth disabled. The anon key/anon role represents signed-out access; anonymous authenticated identities are a distinct class and were not enabled. Enabling that feature later requires an explicit eligibility decision and tests. Admin credentials were held in memory only for synthetic Auth fixture creation/deletion; all resume operations used owner or signed-out credentials. Final fixture counts: zero resumes and zero Auth users.

## Behavioral matrix

| Case | Actual result |
|---|---|
| Owner A and owner B create, unfiltered list, known-ID read, update, same-ID upsert, delete | PASS |
| Complete blank draft and partial object draft | PASS |
| Optional fields, photo string, formatting, bullets, checker advice round-trip | PASS |
| Server timestamps on insert/update/upsert; caller timestamp overridden; latest ordering; multiple rows | PASS |
| A→B and B→A unfiltered list / known foreign ID | Own rows only / zero foreign rows |
| A→B and B→A foreign UPDATE/DELETE | HTTP 200, zero affected rows; legitimate owner snapshot unchanged |
| Forged owner insert; owned-row owner reassignment | Authorization denial; owner-visible snapshots unchanged |
| Foreign-ID conflict upsert with attacker or victim owner; own-ID upsert reassignment | Authorization denial; original rows unchanged |
| Signed-out list/known-ID/insert/update/delete/upsert, with anon bearer and without Authorization | Authorization denial; legitimate owner snapshots unchanged |
| Invalid JSON, null/unknown owner, duplicate ID | Rejected; no extra rows, final owner snapshots unchanged |

Tests never rely on caller-supplied owner filtering for attack requests. Denied mutations are followed by full owner-visible row equality (including owner, data and timestamp), not HTTP status alone. Final owner row counts detect failed forged inserts that might otherwise leave extra rows. No CV content, tokens or passwords are recorded.

## Metadata and grants

Verified actual local catalogs plus effective `has_table_privilege` / `has_any_column_privilege`, including inherited/PUBLIC access. RLS enabled; exactly four policies restricted to authenticated; UPDATE USING and WITH CHECK both present. Client roles are neither superuser nor BYPASSRLS. ACL contains postgres ownership and authenticated CRUD only; no PUBLIC grants, no client grant options, no anon table/column access, no authenticated TRUNCATE/REFERENCES/TRIGGER/MAINTAIN and no service-role CRUD grants. Owner/latest and primary-key indexes, JSON constraint, six-column nullability/types, Auth FK and timestamp trigger/function verified. Transactional fixture proves cascade deletion.

`supabase db advisors --local --type security --level warn`: **No issues found**. This is local evidence only, not a hosted audit. Current Supabase RLS documentation and changelog were consulted; no relevant migration change was identified. [RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Tests and regressions

| Command / check | Result |
|---|---|
| `supabase test db --local` | **49/49 PASS**, transactional metadata/constraints |
| `node scripts/test-resume-isolation.mjs` | **185 assertions PASS**, owner/A/B/signed-out Data API; cleanup successful |
| `npm test -- tests/unit/resume-store.test.ts tests/unit/resume-saving.test.tsx tests/unit/use-user-race.test.tsx` | **26/26 PASS**, 3 files |
| `npm test` | **628 PASS / 2 FAIL / 13 SKIP**, 63 files |
| `npm test -- tests/unit/builder-loading.test.tsx` | **2/2 PASS** isolated recheck of full-run timeout |
| `node node_modules/typescript/bin/tsc --noEmit` | **FAIL: 15 errors**, unchanged application sources |
| `npm run lint` after formatting new script | **FAIL: 25,842 findings (25,829 errors, 13 warnings)** |
| Scoped ESLint and `node --check` on isolation script | **PASS** |
| `GETHIRED_LOCAL_SAVE_TEST=1; npm run build` | **PASS**, client and SSR production build with synthetic browser settings |

The unit `full_name` payload mismatch is the documented pre-existing ISSUE-009/010 failure. The additional full-run builder import hit its existing 20-second timeout and passed alone; retain both results rather than claiming an entirely green suite. Current type errors include the existing-source router error-component type mismatch in addition to the historically recorded 14 categories/locations. No application TypeScript source or dependencies changed. Lint remains a broad existing formatting/baseline problem; the new script contributes no scoped lint failures. No unrelated failures were fixed. E2E was not rerun: no browser journey changed; historical dashboard/hydration/smoke failures remain unresolved. Database proof is direct REST, not mocked browser coverage.

## Files and release limits

Issue files: `supabase/config.toml`, `supabase/.gitignore`, `supabase/migrations/20261005121313_create_resumes_ownership.sql`, `supabase/tests/resumes_schema.test.sql`, `scripts/test-resume-isolation.mjs`. Continuity: PROJECT_STATUS, KNOWN_ISSUES, ROADMAP, DECISIONS, RELEASE_CHECKLIST, SESSION_INDEX, this journal and the two existing October 4/5 journals. Existing CRM migration unchanged. User-supplied specification, newly appeared `implementation-plan.md` and pre-existing generated route-tree diff are preserved and excluded from the issue commit.

ISSUE-002 is closed only for the explicitly assigned reproducible resume schema and local ownership matrix. Production remains unchanged. Shared checker-cache privacy, analysis versioning/save/signup continuity, account deletion UX/retention, and hosted rollout verification remain release requirements under their existing workstreams. P0 ISSUE-003/004/005/006/007 and other P1 gates remain. Next recommended issue: **ISSUE-003 — Public privileged lead, diagnostics and AI boundaries**. No next-issue work started.
