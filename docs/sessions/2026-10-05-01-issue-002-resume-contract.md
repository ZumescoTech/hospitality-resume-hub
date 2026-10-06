# ISSUE-002 — Proposed resume data contract

Status: PROPOSAL ONLY; ISSUE-002 remains OPEN. No authoritative resume database schema exists (owner clarification, 2026-10-05). This document derives a candidate schema from application evidence; it is not evidence of an existing database design or a replacement product specification. No migration or database mutation was performed.

## Scope and evidence

Objective: identify the smallest resume storage contract, separate source requirements from design choices, and define migration/test exit criteria before implementation.

Inspected sources:

- `src/lib/resume-store.ts`: load selects `id, data, template_id`, filters owner and optionally ID, orders by `updated_at`; save upserts five fields on conflict `id`.
- `src/lib/resume-persistence.ts`: `CloudResume`, `ResumeCloud`, `validateResume`, hydration, UUID creation, local recovery, and cloud saves.
- `src/types/resume.ts`, `src/types/formatting.ts`, `src/types/checker-audit.ts`: document interfaces, optional fields, and defaults.
- `src/lib/cv-import-handoff.ts`: runtime resume and checker-audit schemas.
- `src/routes/builder.tsx`, `src/components/builder/sections/`, `src/components/builder/StyleDrawer.tsx`: form writes, import handoff, advice, template and formatting changes.
- `src/hooks/use-user.ts`, `src/lib/supabase.ts`: session identity and browser client.
- `src/routes/dashboard.tsx`: list fields, owner filter, date ordering, and delete by ID.
- `tests/unit/resume-store.test.ts`, test cases in `resume-saving.test.tsx`, `use-user-race.test.tsx`, and `tests/e2e/resume-saving.spec.ts`: existing application coverage; not database isolation evidence.

`GET_HIRED_PRODUCT_SPEC.md` was initially absent and appeared as an untracked file during this session. It was read without modification: sections 9.7, 12, 15, 16 and 17 supply the relevant analysis persistence, ownership, versioning and privacy requirements. Its conceptual model is not an existing database schema.

## 1. Fields required by the current application

Proposed relation: `public.resumes`. All six columns below are needed by existing queries. PostgreSQL types and constraints are proposed mappings, not recovered DDL.

| Column | Proposed type / nullability | Current application requirement |
|---|---|---|
| `id` | `uuid PRIMARY KEY` | Persistence generates `crypto.randomUUID()` for a new cloud document; upsert conflicts on `id`; dashboard deletes by ID. No database-generated default is needed by the current writer. |
| `user_id` | `uuid NOT NULL REFERENCES auth.users(id)` | Store saves session user ID; load/list filter it. Ownership must be checked independently in the database. FK deletion behavior is unresolved below. |
| `title` | `text NOT NULL` | Writer supplies `data.personal.fullName || 'My CV'`; dashboard displays it. It is a list label, distinct from `data.personal.title` (professional title). No separate rename contract is present. |
| `data` | `jsonb NOT NULL`, object check | Entire `ResumeData` document is sent on each save and runtime-validated on load. Do not split nested fields into tables without a demonstrated requirement. No empty-object default: `{}` is not a valid loaded resume. |
| `template_id` | `text NOT NULL` | Writer copies `data.templateId`; load uses this column to override the embedded template ID; dashboard selects it. No template FK or closed database enum is supported by the current contract. |
| `updated_at` | `timestamptz NOT NULL` | Store selects latest resume and dashboard sorts/displays its date. Writer supplies no timestamp, so the database must initialize it and refresh it on updates, including upserts. |

`NOT NULL` does not mean the CV must be complete. New/partial drafts use empty strings and arrays and must save. Do not impose nonempty contact details, email uniqueness, employment dates as SQL dates, or mandatory experience/certification entries.

### Required shape within `data`

These are document properties, not additional SQL columns. Types below come from `ResumeData`; runtime hydration supplies defaults for many missing legacy properties. Required interface properties therefore do not all need strict database JSON-key checks.

| Property | Required interface content | Optional content to preserve when supplied |
|---|---|---|
| `personal` | Strings: `fullName`, `title`, `email`, `phone`, `location` | `photo` (data URL string), `photoPosition` (`top-left`, `top-right`, `centre`), `links` array of `{label, url}` strings |
| `summary` | String, including empty | — |
| `experience` | Array; each entry: string `id`, `role`, `venue`, `startDate`, `endDate`, `description` | `location` string, `current` boolean, `bullets` string array; preserve bullets and description rather than collapsing them |
| `education` | Array; each entry: string `id`, `school`, `degree`, `startDate`, `endDate` | `field`, `description` strings; `bullets` string array |
| `skills` | String array | — |
| `certifications` | Array; each entry: string `id`, `name`, `issuer`, `year` | `expiry` string |
| `hospitality` | `serviceStyles`, `posSystems` string arrays; `wineKnowledge`, `spiritsKnowledge` enums; `languages` array of name/level; `allergens` boolean | `foodSafety` string |
| `templateId` | String | — |

Hospitality enum values: wine knowledge `None/Beginner/Intermediate/Advanced/Sommelier`; spirits knowledge `None/Beginner/Intermediate/Advanced/Mixologist`; language level `Basic/Conversational/Fluent/Native`.

Existing optional document properties are part of application compatibility, not speculative additions:

- `targetJobDescription`, `targetRoleSlug`, `references`: strings; written by personal form/handoff or builder role initialization.
- `formatting`: `fontFamily` (Calibri/Cambria/Arial/Helvetica/Garamond), numeric `bodyFontSize` and `headingFontSize`, `lineSpacing` (1.15/1.2), `marginInches` (0.5/0.75/1). Runtime validation requires finite sizes, not the narrower ranges suggested by comments.
- `templateColours`: map from template ID to string `primary`, `accent`, `text`, `background` values.
- `checkerAudit`: `overallScore`, `tier`, optional `confidence`, seven score/weight/feedback categories, string arrays `topFixes`, `missingKeywords`, `matchedKeywords`, `deterministicFeedback`, and `fixes` entries (ID/title/explanation/priority/targetSection/kind plus optional certName/keyword/completedManually). Exact shape remains in `auditSchema` and `CheckerAudit`; no separate score/report column is required by the resume queries.

Nested entry IDs are arbitrary strings, unlike newly generated cloud resume IDs. Dates may be partial dates, empty strings, or descriptive text. Preserve their current string representation. Undefined optional properties are omitted in JSON; do not require JSON null instead.

`Draft.version`, `dirty`, `revision`, `writer`, `cloudExists`, active-document pointers, save statuses and recovery copies are browser persistence metadata. They are not in the cloud upsert payload. Handoff `schemaVersion`, expiry, and `sourceText` are also not required resume columns. In particular, local `version: 2` is not a database document version.

## 2. Fields required by the product specification

The specification does not define a resume table or require additional resume-specific columns. It defines a conceptual **Analysis** model (section 15), with naming adaptable to implementation. These requirements must not be silently conflated with the builder document:

| Specification requirement | Field concepts / consequence for this proposal |
|---|---|
| Saved report belongs to authenticated owner; owner can retrieve it; cross-user access denied (12.3, 12.5, 17.1) | `user_id` supports ownership of the saved resume and embedded advice. It does not prove isolation of separately stored analyses/cache entries. |
| Conceptual Analysis minimum (15) | `id`, optional `user_id`, `session_id`, `target_role_id`, optional `custom_role`, `status`, optional `overall_score`, `category_scores`, `issues`, `recommendations`, `warnings`, `created_at`, optional `updated_at`, plus four versions below. These are analysis concepts, not a mandate to add them to the resume table. |
| Historical analysis versioning (9.7, 16) | Persist `role_profile_version`, `parser_version`, `analysis_version`, `report_schema_version` with analyses. Current `checkerAudit` does not contain them and `targetRoleSlug` alone does not satisfy this requirement. |
| User and Feedback conceptual models (15) | User: `id`, `created_at`; Feedback: `id`, `analysis_id`, `rating`, optional `comment`, `created_at`. These belong to their respective entities, not new resume columns. |
| Successful signup retains analysis; auth failure preserves recovery (12.3–12.5) | Requires a verified continuity flow, not merely table columns. Resume RLS does not implement saved-report continuity. |
| Minimize raw retention and define deletion/access behavior (15.1, 17.1) | No requirement to persist original files or raw extracted text in `resumes`. Exact retention duration and account-delete cascade behavior remain unspecified. |

The six-column proposal is scoped to current builder persistence. It must not be presented as satisfying the full saved-analysis model or F-006. Selecting a separate analysis relation or a versioned embedded report is a subsequent design decision under report continuity; no speculative analysis columns are added here. Resume cardinality and detailed JSON layout are not prescribed by the specification.

## 3. Optional/recommended additions

No additional SQL columns are proposed for the initial contract. In particular, `created_at`, `deleted_at`, sharing flags, organization IDs, source-file URLs, analytics identifiers, and database revision/version columns lack a demonstrated current requirement.

Recommended database structure/behavior (not extra fields):

- Index `(user_id, updated_at DESC)` for current owner-list/latest queries. Do not make `user_id` unique: dashboard lists multiple rows, even though new/open document navigation still has separate product gaps.
- Server-managed `updated_at`: initialize on insert and refresh on update via a small invoker trigger with a fixed search path; test both insert and conflict-update paths. No privileged CRUD RPC is needed.
- Minimum JSON constraint `jsonb_typeof(data) = 'object'`. This is not full `ResumeData` validation. Retain runtime validation and recovery behavior; decide any stricter database checks only after compatibility fixtures and specification review.
- Explicit grants and RLS in the same reproducible migration, with no public views, storage buckets or report tables added for this contract.

## 4. Assumptions and unresolved decisions

| Question | Proposed direction / limitation |
|---|---|
| UUID compatibility | New cloud IDs are UUIDs, but active-pointer validation allows other strings and TypeScript uses `string`. UUID is the proposed SQL type; inspect any supported legacy synthetic fixture/import contract before finalizing. No authoritative historical cloud rows are assumed. |
| User deletion | Reference `auth.users(id)`; the specification requires explicit retention/deletion decisions but gives no cascade rule. Conservative proposed initial behavior is `NO ACTION`. This would block account deletion while rows remain and needs an explicit decision before implementation. |
| Duplicate template representation | Keep both fields for existing client compatibility. Current writer matches them; current loader treats the column as authoritative. No equality constraint or automatic rewrite is proposed without a compatibility decision. |
| Template defaults | Blank builder uses `classic`; import runtime schema defaults missing template IDs to `vintage`. Require the client-supplied column rather than inventing a conflicting database default. |
| JSON limits/versioning | No database payload limit or version field is established by inspected persistence code. Photo data URLs can enlarge documents. Do not invent a limit/version migration in this proposal. |
| Concurrent devices | Local revision/Web Locks protect browser behavior, not database optimistic concurrency. Existing upsert replaces the document; no cross-device conflict guarantee can be claimed. |
| Anonymous identities | Signed-out clients are device-only. Supabase anonymous-auth users, if enabled, have authenticated sessions; actual eligibility/configuration is unverified. The specification allows guest analysis but does not decide anonymous Auth eligibility for cloud resume storage. |
| Report cache | Optional `data.checkerAudit` is owned with its resume. This does not secure or replace the separate shared report cache; that unresolved isolation surface remains part of the release gate. |

## Proposed ownership rules

Use database session identity, never a caller-supplied owner as authorization proof. Proposed policies are limited to `authenticated`: SELECT and DELETE require `(select auth.uid()) = user_id`; INSERT checks the same expression; UPDATE checks both existing and resulting ownership using explicit USING and WITH CHECK. This supports owner upserts while preventing ownership reassignment and cross-owner conflict updates. Explicit WITH CHECK improves clarity; its omission alone is not proof of a flaw because PostgreSQL can reuse USING.

Revoke unintended table/column privileges from PUBLIC and anon; grant authenticated only required SELECT/INSERT/UPDATE/DELETE access. Inspect effective/inherited grants and ensure no TRUNCATE or other unnecessary client privileges remain. Enable RLS explicitly rather than relying on ServSail's event trigger. No service-role client path is proposed. Grants and policies are separate controls; see [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Migration and verification exit criteria

This proposal is not an executable migration. After resolving the remaining design decisions:

1. Generate a Supabase migration through the CLI, checking in the six-column table, constraints, index, timestamp function/trigger, explicit grants and ownership policies together. Reproduce from an empty approved non-production database; do not assume a pre-existing resume schema. Inspect interactions with existing migrations/event triggers without changing CRM behavior.
2. Add database policy/constraint tests and direct Data API tests with approved synthetic A/B sessions plus signed-out anon. Mocked React tests are insufficient. Verify metadata and effective grants as well as behavior.
3. For each owner, prove create, read/list, update, same-ID upsert and delete succeed. Include blank drafts and round-trip all existing optional fields, photos, formatting, bullets and checker advice. Verify `updated_at` changes on update/upsert and latest ordering works.
4. In both A-to-B and B-to-A directions, attempt unfiltered list, known-ID read, update, delete, forged-owner insert, owner reassignment, and conflicting-ID upsert (both attacker-owned and victim-owned payload variants). Requests must not rely on client owner filters. Assert no foreign content returned and no foreign row changed, even when the API returns success with zero affected rows.
5. Run anonymous SELECT/INSERT/UPDATE/DELETE/upsert attempts, including known IDs; require no read or write access. Exercise null/unknown owners, duplicate IDs and invalid JSON shape. If anonymous Auth sign-in is supported, test its separately agreed behavior.
6. After each denied mutation, verify original synthetic row content and owner remain unchanged. Record operation/status/row count without tokens or CV content; clean up only fixtures created for the test.
7. Run relevant persistence/auth regression tests and capture actual results. Resolve or explicitly retain the shared report-cache isolation gap; do not close ISSUE-002 or the release authorization gate based only on a new table or passing mocked tests.

## Session result

Documentation only, on existing `main` worktree; pre-existing five documentation changes and newly supplied untracked specification preserved. Code/specification-derived proposal complete; schema implementation and behavioral evidence pending. No schema application, database writes, tests of database isolation, commit or deployment. Local setup from the preceding check: Supabase CLI 2.100.1 available, Docker engine not running, approved test target not established. These are setup limitations, not newly confirmed product defects. Tracked diff whitespace check passed; application tests were not rerun for this documentation-only change.
