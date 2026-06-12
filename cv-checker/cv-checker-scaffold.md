# Cruise CV Checker — MVP Scaffold

## What you have now

- **`cruise-roles.json`** — your Google Sheet converted into a single structured
  JSON file: 13 hotel-department roles, each with a summary, common experience
  requirements, CV expectations, certifications, language requirements, and a
  master keyword list. This is the "knowledge base" the checker compares CVs against.
- **`cruiseCvRubric.ts`** — the general cruise-CV rubric (the checks that apply
  to *every* role — personal info block, certs, photo, cover letter, etc.) plus
  a `buildCvCheckPrompt()` function that merges the general rubric with the
  role-specific data from `cruise-roles.json` into a single prompt for Claude Haiku.
- **`cruise-cv-check-handler.ts`** — example endpoint logic: load role data,
  build the prompt, call Haiku, parse the JSON result.
- **`convert-roles.mjs`** — re-run this any time the Google Sheet is updated
  (after a fresh Cowork scan) to regenerate `cruise-roles.json`.

## Why this is a no-cost / near-zero-cost setup

| Component | Cost |
|---|---|
| Reference data (`cruise-roles.json`) | $0 — static file bundled into your app at build time. No Google Sheets API calls, no auth, no rate limits at runtime. |
| Frontend route on Get Hired | $0 — just another route in the existing app. |
| Backend endpoint | $0 — Cloudflare Workers free tier (100k requests/day) is far more than a lead-gen tool needs. |
| Lead storage | $0 — Supabase free tier (500MB DB) is more than enough for emails + scan results. |
| AI analysis | Small, usage-based — Claude Haiku is a few hundredths of a cent per CV scan. This is the only line item with any real cost, and it's already part of Get Hired's stack. |

If you ever want the AI step to be literally $0 too, Groq's free tier (which
you're already using elsewhere) can run Llama models for this — but JSON-output
reliability is generally better with Haiku, and the cost difference at this
volume is negligible. I'd start with Haiku and only revisit if usage scales up
significantly.

## Where things live in the project

```
src/
  data/
    cruise-roles.json          <- drop the converted reference data here
  lib/
    cruiseCvRubric.ts           <- rubric + prompt builder
  routes/
    tools/
      cruise-cv-checker.tsx     <- frontend page (new)
    api/
      cruise-cv-check.ts        <- backend endpoint (new)
scripts/
  convert-roles.mjs             <- re-run when the sheet updates
```

(Adjust paths to match your actual TanStack Start project structure — these
are suggestions, not requirements.)

## Request/response flow

1. **Frontend** (`/tools/cruise-cv-checker`):
   - User uploads CV (PDF/docx) → extract text client-side with mammoth/pdfjs-dist
     (same pipeline Get Hired already uses).
   - User selects a role from a dropdown populated via `getRoleOptions()`.
   - Optional: paste a specific job ad they're applying to.
   - POST `{ cvText, roleSlug, jobAdText? }` to `/api/cruise-cv-check`.

2. **Backend** (`/api/cruise-cv-check`):
   - Look up the role in `cruise-roles.json` by `roleSlug`.
   - Build the prompt via `buildCvCheckPrompt()`.
   - Call Claude Haiku, get back structured JSON via `parseCvCheckResponse()`.
   - Return the result to the frontend.

3. **Results page**:
   - Show `overall_score` as a gauge + `risk_level` label.
   - Show `top_issues` (2-4 items) free, immediately.
   - Gate the full `categories` breakdown behind an email field — on submit,
     write `{ email, roleSlug, overall_score, categories, top_issues, utm }`
     to a Supabase table (e.g. `cruise_cv_leads`).
   - Below the full report, a CTA banner linking to Get Hired's paid CV builder,
     with the role pre-selected via query param (e.g. `?role=buffet-attendant`).

4. **Nurture (optional, later)**:
   - n8n watches the `cruise_cv_leads` table (or a Supabase webhook) and sends
     a short email sequence — "here's what a strong cruise CV looks like for
     [role]" over a few days, ending with the Get Hired offer.

## Updating the reference data later

When you run another Cowork scan to add more roles or refresh postings:

1. Export the updated Google Sheet as `.xlsx`.
2. Run:
   ```
   node scripts/convert-roles.mjs ./Cruise_Hotel_CV_Reference_Data.xlsx ./src/data/cruise-roles.json
   ```
3. Commit the updated `cruise-roles.json`. No code changes needed — the rubric
   and handler both read from this file dynamically.

## Suggested build order for the MVP

1. Drop `cruise-roles.json` and `cruiseCvRubric.ts` into the project.
2. Build the `/api/cruise-cv-check` endpoint using `cruise-cv-check-handler.ts`
   as a starting point — wire up your existing Anthropic API key env var.
3. Build a minimal results UI: score gauge + top issues (no email gate yet,
   no Supabase yet) — get the end-to-end flow working first.
4. Add the email-gated full report + Supabase lead table.
5. Add the Get Hired CTA with role pre-fill.
6. (Later) Wire up n8n nurture sequence.

Steps 1-3 alone give you a working, testable diagnostic — everything after
that is conversion optimization and follow-up automation.
