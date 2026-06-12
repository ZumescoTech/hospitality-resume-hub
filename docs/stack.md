# Locked Stack & Architecture Decisions

*Updated: June 2026 — overrides any conflicting notes in gap-analysis.md*

---

## Locked Choices

| Layer | Decision | Notes |
|---|---|---|
| Frontend + API | TanStack Start + Cloudflare Pages/Workers | No migration to Next.js/Vercel |
| Auth + DB | Supabase (free tier) | @supabase/supabase-js |
| File parsing | **Client-side** — mammoth (browser build) + pdfjs-dist | No server-side parsing route needed |
| PDF export | @react-pdf/renderer — client-side via `PDFDownloadLink` | Already implemented (Sprint 1) |
| ATS keywords | Curated Supabase table per hospitality role | Replaces SerpAPI — no live job ad fetching |
| AI | Claude Haiku | Called from TanStack Start server functions (Cloudflare Workers) to keep API key server-side |
| Billing | Stripe | Webhooks handled in server functions |

---

## Architecture Diagram

```
Browser (React)
│
├── Form Builder ──→ ResumeData (localStorage / Supabase)
├── File Upload  ──→ mammoth / pdfjs-dist (client-side parse)
│                    └──→ extracted text
├── PDF Export   ──→ @react-pdf/renderer (client-side, web worker)
│                    └──→ downloads .pdf
│
└── HTTP calls to Cloudflare Workers (TanStack Start server functions)
     ├── POST /api/auth/* ──→ Supabase Auth
     ├── POST /api/ats-score ──→ Claude Haiku (ATS scoring)
     ├── POST /api/ai-edit   ──→ Claude Haiku (auto-edit, Pro only)
     ├── POST /api/cover-letter ──→ Claude Haiku (Pro only)
     ├── POST /api/checkout  ──→ Stripe Checkout session
     └── POST /api/stripe-webhook ──→ Stripe events → Supabase subscriptions table
```

---

## Key Constraint: Cloudflare Workers ≠ Node.js

Cloudflare Workers run on V8 isolates, **not** a full Node.js runtime. This matters for:

- **File parsing**: Use client-side libraries only (mammoth browser build, pdfjs-dist). Do NOT attempt server-side parsing on Workers — `Buffer`, `fs`, and most Node.js APIs are unavailable.
- **Stripe webhook verification**: Use `stripe.webhooks.constructEventAsync()` (the async Web Crypto API variant) instead of `stripe.webhooks.constructEvent()` (which uses Node.js crypto). This is documented in the Stripe Cloudflare Workers guide.
- **PDF generation**: Runs client-side in a browser web worker. No Workers involvement needed.

---

## ATS Keyword Bank (replaces SerpAPI)

Instead of fetching live job ads, the scoring system uses a curated keyword table in Supabase:

### Table: `role_keywords`
```sql
create table role_keywords (
  id          uuid primary key default gen_random_uuid(),
  role_slug   text not null,           -- 'waiter', 'sommelier', 'bartender', 'chef', 'front-of-house'
  role_label  text not null,           -- human-readable label
  keywords    text[] not null,         -- ATS keywords for this role
  sections    jsonb,                   -- { required: [], preferred: [], nice_to_have: [] }
  updated_at  timestamptz default now()
);
```

### Seeded roles (Sprint 4)
- `waiter` — covers waiting staff, floor staff, FOH
- `sommelier` — covers wine service, cellar management
- `bartender` — covers bar staff, cocktail/mixology roles
- `chef` — covers kitchen brigade: sous chef, chef de partie, etc.
- `front-of-house` — covers reception, host/hostess, concierge
- `catering` — covers events and catering roles
- `hotel-fb` — covers hotel food & beverage

### Scoring logic
```
score = (matched_required_keywords / total_required_keywords) * 70
      + (matched_preferred_keywords / total_preferred_keywords) * 20
      + formatting_bonus (up to 10 points: has summary, has certs, has photo, etc.)
```
Claude Haiku refines the raw score and generates the written feedback (keyword gaps, improvement tips).

---

## Revised Sprint Plan (stack-locked)

### Sprint 1 — Foundation ✅ COMPLETE
- [x] Fix Lovable boilerplate (`__root.tsx`)
- [x] Photo resize before base64 (`PhotoUpload.tsx`)
- [x] `@react-pdf/renderer` PDF export (`ResumePDF.tsx`, `PDFDownloadButton.tsx`)
- [x] PDF download wired into PreviewPanel + header

### Sprint 2 — Auth + Data Persistence (~3–4 days)
- Supabase project + tables (`profiles`, `resumes`, `subscriptions`)
- `@supabase/supabase-js` installed
- `/sign-in` and `/sign-up` routes
- `useUser()` hook
- Cloud sync in `useResumeStore` (write to Supabase when authed, localStorage when anon)
- `/dashboard` route — resume list + account status

### Sprint 3 — Stripe Billing (~2 days)
- Stripe product + price created
- `POST /api/create-checkout-session` server function
- `POST /api/stripe-webhook` server function (async verification for Workers)
- `useSubscription()` hook
- `<SubscriptionGate>` component
- `/pricing` page

### Sprint 4 — Upload & Optimise (~5–7 days)
- `/upload` route
- Client-side file parsing (mammoth browser bundle + pdfjs-dist)
- Role selection UI + keyword bank fetch from Supabase
- ATS scoring: client sends parsed text → server function → Claude Haiku → score returned
- `ATSScoreCard` component (score gauge, keyword chips, tips)
- Free: see score number only. Pro: full breakdown + AI rewrite button.
- `POST /api/ai-edit` server function (Pro only, Claude Haiku)

### Sprint 5 — Cover Letter (~2 days)
- `/cover-letter` route or modal
- Generic mode (role-based) + job-specific mode (paste job ad)
- `POST /api/cover-letter` server function
- Editable output + PDF export reusing `PDFDownloadButton`

### Sprint 6 — Polish & Launch (~2–3 days)
- Onboarding flow (role picker → build or upload)
- Error boundaries + skeleton loaders
- Legal pages (Privacy, Terms)
- SEO meta cleanup
- Role keyword bank seed data finalized

---

## Package Installs Remaining

```bash
# Sprint 2
npm install @supabase/supabase-js

# Sprint 3
npm install stripe @stripe/stripe-js

# Sprint 4
npm install mammoth pdfjs-dist react-dropzone

# Sprint 5 (AI calls)
npm install @anthropic-ai/sdk
```

`@react-pdf/renderer` — already installed ✅
