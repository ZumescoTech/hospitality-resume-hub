# ISSUE-002 ownership verification

Date: 2026-10-04. Status: **PARTIAL; OPEN**. Source checkpoint: `d5de2d1`, clean `main` at start. No application/schema changes, commit, deployment, or database writes.

## Scope and object inventory

| Object | Purpose | Ownership column | Access path |
|---|---|---|---|
| `public.resumes` (absent in ServSail) | Saved builder CV including optional `data.checkerAudit` | `user_id` in application payload/query | `src/lib/resume-store.ts`: `cloud.load`, `cloud.save`; `src/routes/dashboard.tsx`: `fetchResumes`, `deleteResume` |
| Supabase Auth user | Supplies applicant identity | Auth user `id` | `src/hooks/use-user.ts`: `useUser`; sign-in/sign-up routes use Auth APIs |
| Completed checker report | React state; no Supabase saved-report access found | None | `src/routes/tools/cruise-cv-checker.tsx`: result state |
| `CV_RESULT_CACHE` | Shared checker result cache, 30-day TTL | None; content/role/tier/version-derived key | `src/lib/cruise-cv-check.ts`: `runCruiseCvCheck`; `src/lib/kv-cache.ts`: `buildCacheKey`, `getCachedResult`, `setCachedResult` |
| Browser drafts/handoff | Local recovery and checker-to-builder transfer | Account draft keys include user ID; anonymous keys do not | `src/lib/resume-persistence.ts`, `src/lib/cv-import-handoff.ts`, checker route |

No profile ownership table, Storage bucket client, or RPC call was found in the targeted persistence/auth/routes/component search. Remote metadata subsequently confirmed no matching resume/report/profile/account/analysis relations in non-system schemas, no Storage buckets and no Edge Functions. CRM tables are not saved-resume storage; their existing authorization defect remains ISSUE-003.

## Authorization evidence

`cloud.load` and `fetchResumes` filter `user_id`. `cloud.save` accepts an ID and owner and upserts on `id`; `deleteResume` filters only by ID. These browser-side filters are not authorization proof. `useResumeStore` derives its normal owner from `useUser`, but direct API callers can supply different IDs.

Only `20260826_create_gethired_leads.sql` exists under `supabase/migrations`; no resume DDL, policies, grants, ownership FK, triggers, views, or function definitions are captured. Live ServSail metadata confirms `public.resumes` does not exist. Consequently there are no resume policies/grants to assess, and intended resume ownership controls cannot be verified. This is a confirmed persistence/schema gap, not a confirmed isolation exploit.

The browser client reads only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The service-role variable is read by `getLeadDb` for server-function CRM operations, not by saved-resume code. Source/config inspection found no explicit browser exposure of that variable; actual deployed key classes and deployed bundle exposure were not verified. No secrets were printed.

`persistCvLead` and `persistLeadJourney` use the privileged CRM client with caller-supplied phone/lead ID and no ownership proof in those handlers. This reconfirms the existing ISSUE-003 source finding; it does not prove access to `resumes`. Live metadata found no public views or Edge Functions. The sole public routine, `rls_auto_enable`, is SECURITY DEFINER with EXECUTE privileges for both anon and authenticated. Its definition returns `event_trigger`, fixes search_path to pg_catalog, and enables RLS on newly created public tables using DDL event metadata; it is not an ordinary callable resume CRUD RPC. No bypass of applicant rows was established. A text-reference search of other schemas found only the invoker storage listing routine; text search is not a complete proof against dynamic SQL. No applicant tables exist on which to inspect dependent triggers.

The checker cache returns matching normalized-input results without account identity. No arbitrary cache-key lookup endpoint was found. This is a shared derived-result path, not evidence of resume-row compromise; report privacy/isolation requires follow-up before a broad isolation PASS.

## Environment and execution evidence

The owner explicitly identified **ServSail** (`izjkvdhureyadgruourb`) as the project. Read-only MCP metadata queries on 2026-10-04 returned:

- `to_regclass('public.resumes') is not null`: **false**.
- Public table/view/materialized-view/foreign-table inventory: **gethired_leads, gethired_lead_events only** (names only; no CRM row reads).
- Resume/report/profile/account/analysis relation-name match across non-system schemas: **0**; matching policies/grants: **0**.
- `storage.buckets` count: **0**; Edge Function list: **empty**.
- Branch list: **default main only**; no non-production branch established.
- `pgrst.db_schemas` setting: **null**, so the exposed-schema configuration is not established by that setting.
- Public routine metadata/definition: `rls_auto_enable`, discussed above.

The initial multi-statement metadata call returned an ambiguous empty final result; it was not used as proof of absent tables. A single aggregated JSON query and explicit `to_regclass` check established absence. No database DDL/DML, Auth user creation, applicant-record reads, or tests against production occurred. No local Supabase config/schema exists to reproduce intended resume policies.

Minimal read-only reproduction (no applicant rows):

```sql
select to_regclass('public.resumes') as resumes;
select n.nspname, c.relname, c.relkind, c.relrowsecurity
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where c.relkind in ('r','p','v','m','f')
  and (n.nspname = 'public' or
       (n.nspname not in ('pg_catalog','information_schema')
        and n.nspname not like 'pg_toast%'
        and c.relname ~* '(resume|report|profile|account|analysis)'));
select schemaname, tablename, policyname, roles, cmd, qual, with_check
from pg_policies where tablename ~* '(resume|report|profile|account|analysis)';
select count(*) as bucket_count from storage.buckets;
```

Use separate calls or aggregate results when executing through MCP; record all result sets. Reproduce Edge Function/branch inventory through `list_edge_functions` / `list_branches` for the project above.

| Operation | Identity / ownership | Actual result |
|---|---|---|
| Create | A / A | NOT RUN: resume table absent; no test environment |
| Read | A / A | NOT RUN |
| Update | A / A | NOT RUN |
| Delete | A / A | NOT RUN |
| Read | A / B | NOT RUN |
| Update | A / B | NOT RUN |
| Delete | A / B | NOT RUN |
| Insert forged owner | A / B | NOT RUN |
| Reassign ownership | A / A to B | NOT RUN |
| Reverse isolation | B / A | NOT RUN |
| Anonymous access | anon / synthetic A and B | NOT RUN |
| Conflicting-ID upsert | A / B row ID | NOT RUN |

Confirmed schema gap: the application targets a table absent from the owner-identified database. No cross-user isolation exploit is confirmed. No remediation is justified from absent metadata alone. No build, lint, typecheck or test suite was run; these cannot substitute for live authorization evidence.

## Resume verification

Establish the intended resume schema in an approved non-production environment with two synthetic users, using existing authoritative schema evidence if available. Creating a new schema is a separate implementation decision; no migration was invented during verification. Capture only relevant table columns/constraints, RLS flags, policies, effective table/column grants (including inherited/PUBLIC grants), dependent views/functions/triggers and relevant Edge Functions. Check policy semantics rather than syntax: PostgreSQL can reuse USING as WITH CHECK when omitted; omission alone is not proof of a defect. See [Supabase RLS reference](https://supabase.com/docs/guides/database/postgres/row-level-security).

Then run the matrix directly through the Data API using real A/B sessions and anon access, without owner filters on attack requests. Include the application's upsert conflict path, and verify unchanged synthetic rows after denied mutations. Exercise any discovered alternate access paths. Record operation/status/row count only, never tokens, and clean up only created test fixtures. Do not mark ISSUE-002 closed until configuration and behavioral evidence both pass.
