# Get Hired — Full Codebase Audit & Build Plan
*Generated: June 2026 | Based on full file-by-file read + competitor research*

---

## Executive Summary

The codebase is a well-built frontend-only CV builder. It delivers Feature 1 (Build from Scratch) at roughly 70% — the form, live preview, and 11 templates all work. Everything else in the spec is a blank canvas: no backend, no auth, no Stripe, no file parsing, no ATS scoring, no AI, no job search, no Upload & Optimise path at all.

The biggest structural concern is not missing features — it's the framework mismatch. The master spec says **Next.js + Vercel + Supabase**. The codebase is **TanStack Start + Cloudflare Workers + no backend**. Every API route, auth integration, and server-side feature needs to be built against one or the other stack. That decision must be made before any backend work starts or you'll throw it away.

---

## Part 1 — What Exists vs What the Spec Requires (File by File)

### `/src/types/resume.ts` ✅ Complete
All type definitions are present and well-structured: `PersonalDetails`, `Experience`, `Education`, `Certification`, `Hospitality`, `ResumeData`. The `Hospitality` type is genuinely strong — POS systems, wine/spirits levels, service styles, food safety — these are differentiators vs generic resume builders.

**Gap**: No types for `User`, `Subscription`, `ATSScore`, `JobAd`, `CoverLetter`, or `ParsedUpload`. These are required for Feature 2.

---

### `/src/lib/resume-store.ts` ⚠️ Partially Complete
`useResumeStore` works cleanly for the local builder. localStorage persistence is fine for anonymous builds.

**Gap**: This hook is localStorage-only. There is no Supabase `users` table sync, no server-side save, no per-user resume history. Once auth lands, this hook needs a cloud-sync layer — either replace localStorage with Supabase Row Level Security (RLS) queries, or write a sync wrapper.

---

### `/src/routes/index.tsx` ⚠️ Partially Complete
The builder page is solid. Step-based navigation, mobile tab switcher, live preview — all done.

**Gaps**:
- Export button downloads JSON, not PDF. The spec requires PDF export. `window.print()` works as a workaround but produces inconsistent output across browsers and has no A4 margin control.
- No auth guard. Anyone can access, but there's nothing to guard anyway since there are no paid features yet.
- The "Upload & Optimise" entry path doesn't exist as a route.

**Missing routes entirely**:
- `/upload` — Upload & Optimise entry path
- `/dashboard` — User resume history + subscription status
- `/pricing` — Pricing page
- `/sign-in`, `/sign-up` — Auth pages
- `/api/*` — All server-side routes (auth, Stripe webhooks, file parsing, ATS scoring, AI)

---

### `/src/routes/__root.tsx` ⚠️ Needs Cleanup
Functional but contains Lovable.dev boilerplate in meta tags (line 36: `{ title: "Lovable App" }`, line 37: `content: "Lovable Generated Project"`, line 42: `{ name: "author", content: "Lovable" }`). These will appear in browser tabs and search previews.

**Fix required before launch**: Replace with Get Hired / Plate & Pen branding.

---

### `/src/components/builder/*` ✅ Largely Complete

| File | Status | Notes |
|---|---|---|
| `Field.tsx` | ✅ | Reusable field wrapper with label + hint |
| `PhotoUpload.tsx` | ✅ | FileReader-based, stores as data URL. Works for builder. |
| `PreviewPanel.tsx` | ✅ | Swatch gallery + dropdown + zoom + print — well built |
| `Section.tsx` | ✅ | Accordion-style section container |
| `StepProgress.tsx` | ✅ | Progress bar + step pills |
| `TagInput.tsx` | ✅ | Tag input with suggestions — solid UX |

**Section components** — all 6 spec-required sections are implemented:
- `PersonalSection.tsx` ✅ — contact details + photo + summary
- `ExperienceSection.tsx` ✅ — dynamic add/remove, current role checkbox
- `EducationSection.tsx` ✅ — degree, field, dates, description
- `SkillsSection.tsx` ✅ — tag-based skills input
- `CertificationsSection.tsx` ✅ — WSET, ServSafe etc.
- `HospitalitySection.tsx` ✅ — POS, wine, spirits, service styles, languages — differentiator

**Missing builder components**:
- `UploadCV.tsx` — drag-and-drop file upload component for Feature 2
- `ATSScoreCard.tsx` — score display + keyword breakdown + improvement tips
- `CoverLetterEditor.tsx` — editable cover letter with export
- `SubscriptionGate.tsx` — paywall wrapper for AI features

---

### `/src/components/templates/*` ✅ Exceeds Spec

11 templates implemented vs the 3 originally specified in `docs/templates.md` (the master spec says 10+, so this is met):

Classic, Bistro (Classic Professional), Tokyo (Modern Minimal), Cellar (Elegant Sommelier), Claret, Manhattan, Provence, Brasserie, Coastal, Terracotta, Noir.

All templates render inline HTML using inline styles. They accept `{ data: ResumeData }` and render a 794×1123px A4 layout.

**Critical gaps in the template system**:

1. **No ATS-safe export version**. Every template uses inline-styled HTML with `<div>` elements. When printed or exported, some ATS systems can't parse this correctly. The spec explicitly states: *"The visual template and the ATS-export version of the CV should be treated separately."* You need a plain-text or clean HTML ATS export mode alongside the visual output.

2. **`window.print()` is the only export mechanism** (line 97 in `PreviewPanel.tsx`). It opens the browser print dialog, which is unreliable for pixel-perfect A4 output. `@react-pdf/renderer` is the correct solution — it generates actual PDFs with controlled page breaks, fonts, and margins that match the visual template.

3. **Photo is stored as a base64 data URL in localStorage**. Photos embedded as data URLs can cause localStorage quota errors for high-resolution images. Should be stored in Supabase Storage with a URL reference instead.

---

### `/src/lib/utils.ts` ✅ Fine
Standard `cn()` helper for Tailwind class merging.

### `/src/components/templates/utils.ts` ✅ Fine
`formatDate()` and `dateRange()` helpers — clean, reusable.

---

### `/package.json` — Missing All Backend Dependencies

Zero of the following spec-required packages are installed:

| Package | Purpose | Status |
|---|---|---|
| `@supabase/supabase-js` | Auth + database + storage | ❌ Missing |
| `@anthropic-ai/sdk` | Claude API calls | ❌ Missing |
| `stripe` | Billing | ❌ Missing |
| `@stripe/stripe-js` | Frontend Stripe | ❌ Missing |
| `mammoth` | .docx parsing | ❌ Missing |
| `pdf-parse` or `pdfjs-dist` | PDF text extraction | ❌ Missing |
| `@react-pdf/renderer` | Proper PDF export | ❌ Missing |
| `react-dropzone` or equivalent | File upload UX | ❌ Missing |

What is installed is a complete Radix UI component set, TanStack Router/Query, Tailwind 4, Zod, react-hook-form, and Recharts. These are sufficient for the frontend work.

---

### `/vite.config.ts` ⚠️ Framework Mismatch Flag

```ts
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
export default defineConfig();
```

This is a Lovable.dev scaffold using TanStack Start with Cloudflare Workers as the deployment target (`wrangler.jsonc`). The master spec says Next.js + Vercel. This is the most important architectural decision outstanding (see Part 4).

---

## Part 2 — Missing Features That Block MVP Launch

These are ordered by whether their absence makes the product unable to ship to paying users.

### 🚫 Hard Blockers (product cannot launch without these)

**1. PDF Export (proper, not window.print)**
The core value proposition is "build a CV and export it." `window.print()` is unreliable — different browsers produce different margins, fonts sometimes fail to load, page breaks are uncontrolled. Every competitor (Teal, Rezi, Kickresume, Resume.io) provides pixel-perfect PDF download.
- **Solution**: `@react-pdf/renderer` — define PDF-equivalent templates as react-pdf `Document`/`Page`/`Text`/`View` components that mirror the visual templates. The `usePDF()` hook generates a blob URL for download.

**2. User Auth (Supabase)**
Without auth, users can't be charged, their data can't be saved server-side, and subscription state can't be validated. The current localStorage approach loses data on browser clear and is unusable for returning users.
- **Solution**: Supabase Auth (email/password + Google OAuth). Gate the app behind email sign-up at minimum.

**3. Subscription Billing (Stripe)**
The product has a paid tier ($5/month). Without Stripe, there's no revenue. The free tier (manual editor only) can launch without this, but the AI features and Upload & Optimise path require subscription gating.
- **Solution**: Stripe Checkout + webhook handler. Store subscription status in a `subscriptions` table in Supabase. Validate server-side on all AI/premium API routes — never client-side only.

**4. The Upload & Optimise Path (Feature 2)**
This is the second core product feature and the primary differentiator. It is 100% unbuilt. Required pieces:
- File upload UI (drag-and-drop, accept .pdf/.docx/.doc)
- Server-side parsing (Mammoth.js for .docx, pdf-parse/pdfjs-dist for .pdf)
- Role selection UI (dropdown of hospitality roles)
- Job ad fetching (SerpAPI Google Jobs API, 24-hour cache in Supabase)
- ATS scoring engine (Claude API prompt comparing CV to job ads)
- Score display + keyword gap breakdown
- AI auto-edit (paid only — Claude rewrites weak bullet points)
- Manual editor for the parsed/uploaded CV

---

### ⚠️ Required Before Paid Launch (gating and safety)

**5. Subscription Gating Logic**
There is no mechanism to distinguish free vs paid users anywhere in the codebase. The `useResumeStore` hook has no concept of tier. No component checks subscription state. This needs to be a centralized hook (`useSubscription`) that reads from Supabase and gates AI features, auto-edit, and cover letter.

**6. Cover Letter Generator**
Spec-required paid feature. Two modes: generic (role-based) and job-specific (user pastes a job ad). Output must be editable before export. Completely unbuilt.

**7. Dashboard / Resume History**
Users need to see their saved resumes, access prior builds, and manage their account. Currently every page load either reads from localStorage or starts fresh. No user-facing dashboard exists.

**8. Pricing Page**
Essential for conversion. Must clearly show free vs paid ($5/month) tiers and what each includes. Completely missing.

---

### 🛠️ Quality Gaps (won't block launch but will hurt retention)

**9. ATS-Safe Export Mode**
The visual PDF looks great but is not ATS-safe. Templates use `<div>` layouts, inline styles, and decorative elements that confuse ATS parsers. Need a clean plain-text or stripped-HTML export mode that removes columns, tables, icons, and decorative elements — outputs a single-column, black-on-white, section-labeled text document.

**10. Data Persistence + Cloud Sync**
localStorage is wiped on browser clear, is not available cross-device, and will hit quota errors for users with large profile photos (base64 data URLs). Supabase row-level security tables are needed: `resumes`, `users`, `subscriptions`.

**11. Error Handling + Loading States**
The current app has no error boundaries, no loading skeletons, and no offline handling. The spec requires loading states on all async operations.

**12. Email Verification / Onboarding Flow**
No onboarding sequence. New sign-ups need a brief flow: role selection → first resume or upload → CTA to upgrade.

---

## Part 3 — Priority-Ordered Build Plan

The goal is the fastest path to a working, releasable product that delivers real value to a hospitality job seeker. This is ordered by dependency and value density.

---

### Sprint 1 — Foundation (2–3 days)
*Make the existing builder shippable as a free tool. Zero backend required.*

**1.1 — Fix Lovable boilerplate**
- `src/routes/__root.tsx` lines 36–44: Replace Lovable meta tags with Get Hired / Plate & Pen branding
- Cost: 15 minutes

**1.2 — Proper PDF export with @react-pdf/renderer**
- Install `@react-pdf/renderer`
- Create `src/lib/pdf-export.ts` that converts `ResumeData` to a react-pdf document
- Start with 2–3 templates (Classic, Bistro, Cellar) — others follow the same pattern
- Replace "Export JSON" button in `index.tsx` (line 104) with "Download PDF" using the `usePDF()` hook
- This is the single highest-ROI change: it's what every user will immediately try to do
- Estimated: 1 day

**1.3 — ATS-safe export mode**
- Add a `src/lib/ats-export.ts` that serializes `ResumeData` to clean, single-column plain text
- Add "Download ATS-safe .txt" as a secondary export option
- This is a differentiator no generic builder offers and costs ~2 hours

**1.4 — Fix photo storage**
- Cap photo resize to 200×200px in `PhotoUpload.tsx` before storing as data URL
- Prevents localStorage quota errors
- 30 minutes

---

### Sprint 2 — Auth + Data Persistence (3–4 days)
*Required before charging any money or calling this a SaaS.*

**2.1 — Supabase project setup**
- Create Supabase project
- Tables: `profiles(id, email, created_at)`, `resumes(id, user_id, data jsonb, template_id, created_at, updated_at)`, `subscriptions(id, user_id, stripe_customer_id, stripe_subscription_id, status, current_period_end)`
- Enable Row Level Security on all tables
- Install `@supabase/supabase-js`

**2.2 — Auth routes**
- `/sign-in` and `/sign-up` pages using Supabase Auth UI or custom forms
- Email/password + Google OAuth (one social login dramatically improves conversion)
- Auth state via `useUser()` hook wrapping `supabase.auth.getUser()`

**2.3 — Cloud sync for resume data**
- Upgrade `useResumeStore` to write to Supabase `resumes` table when user is authenticated, localStorage when anonymous
- Auto-save on debounced change (500ms)
- On auth, migrate existing localStorage data to Supabase

**2.4 — Dashboard page (`/dashboard`)**
- List user's saved resumes with template thumbnail, last edited date
- Create new / open existing / delete
- Show subscription status (free badge or Pro badge)

---

### Sprint 3 — Stripe Billing (2 days)
*Required before launching the paid tier.*

**3.1 — Stripe integration**
- Install `stripe` (server) and `@stripe/stripe-js` (client)
- Create product in Stripe: "Get Hired Pro" $5/month recurring
- API route: `POST /api/create-checkout-session` — creates Stripe Checkout session, passes `supabase_user_id` in metadata
- API route: `POST /api/webhooks/stripe` — idempotent handler for `customer.subscription.created/updated/deleted`, upserts to `subscriptions` table
- Pricing page at `/pricing`

**3.2 — Subscription gating**
- `useSubscription()` hook: reads from `subscriptions` table, returns `{ isPro, isLoading }`
- `<SubscriptionGate>` wrapper component: shows paywall/upgrade prompt if not Pro
- Gate: AI auto-edit, cover letter generator, ATS score details (free users see score number only, Pro sees keyword breakdown and AI suggestions)
- **Enforce on the API route level too** — check subscription status server-side before calling Claude

---

### Sprint 4 — Upload & Optimise (5–7 days)
*The core SaaS differentiator. Most complex sprint.*

**4.1 — File upload UI**
- New route: `/upload`
- Drag-and-drop component accepting `.pdf`, `.docx` (and `.doc` with server-side conversion note)
- File size limit: 5MB
- Progress indicator during parse

**4.2 — Server-side file parsing**
- API route: `POST /api/parse-cv`
- `.docx`: Mammoth.js → extract raw text
- `.pdf`: pdfjs-dist (handles text-layer PDFs) with fallback note for scanned docs
- Parse output: structured JSON matching `ResumeData` as best as possible (imperfect, user will edit)
- **Never send the raw file to Claude** — parse first, send text only

**4.3 — Job ad fetching**
- API route: `GET /api/job-ads?role=waiter&location=london`
- SerpAPI Google Jobs API call
- Cache results in Supabase table `job_ad_cache(role, location, ads jsonb, fetched_at)` — invalidate after 24 hours
- Return 5–10 ads for the role

**4.4 — ATS scoring engine**
- API route: `POST /api/ats-score`
- Input: parsed CV text + 5–10 job ads
- Claude prompt (hospitality-specific): compare CV against job ad language, extract: numeric score 0–100, missing keywords, formatting issues, top 3 improvement actions
- The prompt must treat each section independently and weight hospitality-specific terms (WSET, POS systems, covers, mise en place, etc.) more heavily than generic terms

**4.5 — ATS Score display**
- `ATSScoreCard` component: animated score gauge, keyword gap chips, improvement bullets
- Free users: see the number. Pro users: see full breakdown + AI rewrite button

**4.6 — AI auto-edit (Pro only)**
- API route: `POST /api/ai-edit` — auth + subscription check first
- Input: parsed CV sections + job ad context
- Claude prompt: improve bullet points using job ad language, preserve original content and tone, do not rewrite from scratch
- Display diff view before user accepts changes

---

### Sprint 5 — Cover Letter Generator (2 days)
*Pro-only feature, monetization hook.*

**5.1 — Cover letter route + UI**
- Accessible from the builder and upload pages
- Two modes: generic (role-based) and job-specific (paste job ad)
- Editable textarea before export
- Export as PDF (reuse the pdf-export infrastructure from Sprint 1)

**5.2 — Cover letter API**
- `POST /api/cover-letter` — auth + subscription check
- Claude prompt: hospitality-specific, warm but professional tone, references actual CV data

---

### Sprint 6 — Polish & Launch Readiness (2–3 days)

**6.1 — Onboarding flow**
- New user → role selection screen → either "Build from scratch" or "Upload & Optimise"
- Quick 3-step tooltip tour for first session

**6.2 — Error boundaries + loading states**
- Wrap async operations in try/catch with toast notifications
- Skeleton loaders on score card, dashboard, template preview

**6.3 — Meta tags + SEO**
- Replace Lovable boilerplate in `__root.tsx`
- Add structured data for the landing/pricing page
- Sitemap

**6.4 — Legal pages**
- Privacy Policy, Terms of Service (required by Stripe and GDPR)
- Cookie consent banner

---

## Part 4 — Architectural Problems to Fix Before Building On Top

### Problem 1 (CRITICAL): Framework vs Spec Mismatch

**The issue**: The master spec says Next.js + Vercel. The codebase uses TanStack Start + Cloudflare Workers (see `vite.config.ts`, `wrangler.jsonc`). These are fundamentally different backend execution environments.

**Why this matters for Get Hired specifically**:
- **Mammoth.js and pdf-parse require Node.js APIs** (Buffer, fs) that don't run on Cloudflare Workers' V8 isolate runtime. You'd need to use Cloudflare Workers AI or a separate Node.js worker for file parsing.
- **Stripe webhooks** need a reliable Node.js runtime for the `stripe.webhooks.constructEvent()` verification. Cloudflare Workers support this but the setup is less documented.
- **Supabase server-client** works on Cloudflare Workers, but the `@supabase/ssr` package (the recommended pattern) is primarily documented for Next.js.
- The team building this likely expected Next.js given the spec.

**Decision required**: Pick one stack and commit.
- **Option A (Recommended)**: Stay on TanStack Start + Cloudflare Workers. It's faster at the edge, cheaper, and the codebase is already scaffolded. Use Cloudflare Workers for API routes (TanStack Start server functions). Use a separate Cloudflare Worker or a Node.js edge function for heavy file parsing. This is viable but requires more setup than Next.js tutorials cover.
- **Option B**: Migrate to Next.js + Vercel. The vercel/nextjs-subscription-payments starter gives you 80% of Sprint 2+3 out of the box. Migration cost is 1–2 days (the frontend components are all framework-agnostic React).

If the team has no strong preference, **Option B is the faster path to launch** given the wealth of Stripe+Supabase+Next.js documentation and starter templates.

---

### Problem 2 (HIGH): Photo Storage Will Break at Scale

**File**: `src/components/builder/PhotoUpload.tsx` + `src/lib/resume-store.ts`

Photos are stored as base64 data URLs inside the resume JSON object in localStorage. A typical profile photo is 50–200KB as base64, which puts pressure on the 5–10MB localStorage limit. One high-resolution upload will silently fail or corrupt the store.

**Fix**: Resize photos to max 200×200px in `PhotoUpload.tsx` using a canvas element before encoding. When Supabase is added, upload to Supabase Storage and store the URL reference instead of the data blob.

---

### Problem 3 (HIGH): Single-Route App, No Auth Guards

**File**: `src/routeTree.gen.ts`, `src/router.tsx`

There is one route (`/`). TanStack Router's `beforeLoad` hooks are the correct place for auth guards. When routes like `/dashboard` and `/upload` are added, they need guards that redirect unauthenticated users to `/sign-in`. This pattern needs to be established in the router config before routes multiply.

**Pattern to establish now**:
```ts
// In the route definition
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: '/sign-in' });
  },
});
```

---

### Problem 4 (MEDIUM): No Environment Variable Strategy

There are no `.env` files, no `VITE_` prefixed variables, no secret management. When Supabase, Stripe, Anthropic, and SerpAPI keys are added, a clear boundary between public variables (VITE_SUPABASE_URL, VITE_STRIPE_PUBLISHABLE_KEY) and private secrets (STRIPE_SECRET_KEY, ANTHROPIC_API_KEY, SERPAPI_KEY) must be established. Secret keys must never be in client-side code.

---

### Problem 5 (MEDIUM): Template Architecture Blocks Proper PDF Export

**Files**: `src/components/templates/*.tsx`

All 11 templates are pure React components that render HTML with inline CSS styles. This is correct for live browser preview, but `@react-pdf/renderer` uses its own layout engine — it does not render HTML. You cannot pass an HTML component to react-pdf.

This means you need **two versions of each template**:
- `ClassicTemplate.tsx` — existing HTML version (for browser preview)
- `ClassicPDFTemplate.tsx` — react-pdf version (Document/Page/View/Text primitives)

The data contract (`ResumeData`) stays identical — only the rendering layer differs. This is the correct separation, and the spec already calls for it ("ATS export vs visual template"). Plan for ~1 day of work per template to create the PDF counterpart (they're simpler than the HTML versions since react-pdf layout is more constrained).

---

### Problem 6 (LOW): `useMemo` Anti-Pattern in `index.tsx`

**File**: `src/routes/index.tsx`, lines 66–77

```ts
const sections = useMemo(
  () => [
    { ...STEPS[0], content: <PersonalSection {...sectionProps} /> },
    ...
  ],
  [data], // recreates JSX elements on every data change
);
```

`sectionProps` contains `data` (which changes on every keystroke) and `onChange`. Wrapping JSX elements in `useMemo` where the dependency is the data itself provides zero memoization benefit — it recreates the array on every change anyway. Remove the `useMemo` here. If re-render performance becomes an issue, the fix is to memoize the individual section components with `React.memo`, not the JSX array.

---

## Summary Tables

### What's Built
| Feature | Status |
|---|---|
| Multi-step form builder (all 6 sections) | ✅ Complete |
| 11 resume templates | ✅ Complete (exceeds spec) |
| Real-time preview panel | ✅ Complete |
| Template switcher (swatch + dropdown + zoom) | ✅ Complete |
| Hospitality-specific section (POS, wine, languages) | ✅ Complete |
| Mobile responsive with tab switcher | ✅ Complete |
| localStorage auto-save | ✅ Complete |
| Print-to-PDF via window.print() | ⚠️ Works but unreliable |
| JSON export | ✅ Works (not spec-required but harmless) |

### What's Missing (by spec section)
| Feature | Priority | Sprint |
|---|---|---|
| Proper PDF export (@react-pdf/renderer) | 🚨 Critical | 1 |
| ATS-safe export mode | 🔴 High | 1 |
| Supabase auth (email + Google OAuth) | 🚨 Critical | 2 |
| Cloud resume persistence | 🚨 Critical | 2 |
| User dashboard | 🔴 High | 2 |
| Stripe subscriptions + webhooks | 🚨 Critical | 3 |
| Subscription gating (server-side) | 🚨 Critical | 3 |
| Pricing page | 🔴 High | 3 |
| CV file upload UI (.pdf / .docx) | 🚨 Critical | 4 |
| Server-side file parsing (Mammoth + pdf-parse) | 🚨 Critical | 4 |
| Job ad fetching (SerpAPI + 24h cache) | 🔴 High | 4 |
| ATS scoring engine (Claude API) | 🔴 High | 4 |
| ATS score display component | 🔴 High | 4 |
| AI auto-edit (Pro only) | 🟡 Medium | 4 |
| Cover letter generator (Pro only) | 🟡 Medium | 5 |
| Error boundaries + loading states | 🟡 Medium | 6 |
| Onboarding flow | 🟡 Medium | 6 |
| Legal pages (Privacy, Terms) | 🔴 High | 6 |
| Replace Lovable meta boilerplate | 🔴 High | 1 |

### Package Installs Needed
```bash
# Sprint 1
npm install @react-pdf/renderer

# Sprint 2
npm install @supabase/supabase-js @supabase/ssr

# Sprint 3
npm install stripe @stripe/stripe-js

# Sprint 4
npm install mammoth pdfjs-dist react-dropzone

# Sprint 5 (already available via Anthropic API, but install SDK)
npm install @anthropic-ai/sdk
```

---

*Total estimated time to MVP launch: 17–22 working days across 6 sprints.*
*The frontend scaffold saves approximately 5–7 days vs starting from zero.*
