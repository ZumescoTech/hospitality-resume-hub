# CLAUDE.md — Plate & Pen / Get Hired
*Read this file before writing a single line of code.*

---

## What This Is

**Plate & Pen** (working name: Get Hired) is a hospitality-focused CV builder SaaS.

Two entry paths:
1. **Build from scratch** — multi-step form → live preview → template picker → PDF export
2. **Upload & Optimise** — upload existing CV → ATS score against role keywords → AI edit → PDF export

Target users: waiters, sommeliers, bartenders, chefs, front-of-house staff.
Paid tier: $5/month (Stripe). Free tier: manual builder + ATS score number only. Pro tier: full keyword breakdown + AI auto-edit + cover letter generator.

---

## Locked Stack — Do Not Deviate

| Layer | Choice |
|---|---|
| Frontend + SSR | **TanStack Start** (React 19) |
| Routing | **TanStack Router** (file-based, `/src/routes/`) |
| Styling | **Tailwind CSS v4** |
| Deployment | **Cloudflare Pages + Workers** (via `wrangler.jsonc`) |
| Auth + DB | **Supabase** (`@supabase/supabase-js`) |
| File parsing | **Client-side only** — mammoth (browser build) + pdfjs-dist |
| PDF export | **@react-pdf/renderer** — client-side via `PDFDownloadLink` |
| AI | **Claude Haiku** via `@anthropic-ai/sdk` (server functions only) |
| Billing | **Stripe** (webhooks in server functions) |
| UI components | **shadcn/ui** (Radix primitives + Tailwind) |

### NEVER use:
- Next.js, Vercel, React Server Components
- SerpAPI or any live job-ad scraping
- Server-side file parsing (no mammoth/pdfjs in Workers)
- `localStorage` for anything other than the anonymous builder state
- `any` in TypeScript unless inside a third-party type workaround
- Inline `style=` props on components — use Tailwind classes
- `console.log` left in committed code

---

## Current State (Sprint 1 complete)

### ✅ Built and working
- Multi-step form builder: Personal, Experience, Education, Skills, Certifications, Hospitality sections
- 11 resume templates (HTML/Tailwind, browser-only visual preview)
- Real-time preview panel with zoom + template switcher swatch gallery
- `@react-pdf/renderer` PDF export: `src/lib/pdf/ResumePDF.tsx` + `PDFDownloadButton.tsx`
- Photo upload with canvas-resize (max 400×400px before base64)
- localStorage auto-save for anonymous users
- Mobile responsive with tab switcher (Edit / Preview)
- `window.print()` kept for visual template printing (secondary)

### ❌ Not yet built
- Supabase auth, user accounts, cloud persistence
- Stripe billing + subscription gating
- Upload & Optimise path (file upload, parsing, ATS scoring, AI edit)
- Cover letter generator
- Dashboard, pricing page, sign-in/sign-up routes
- Error boundaries, loading skeletons

See `docs/stack.md` for the full sprint plan.

---

## Folder Structure

```
src/
├── routes/                  # TanStack Router file-based routes
│   ├── __root.tsx            # Root shell (head, Toaster)
│   ├── index.tsx             # / — Builder page
│   ├── sign-in.tsx           # /sign-in         (Sprint 2 — TODO)
│   ├── sign-up.tsx           # /sign-up          (Sprint 2 — TODO)
│   ├── dashboard.tsx         # /dashboard        (Sprint 2 — TODO)
│   ├── upload.tsx            # /upload           (Sprint 4 — TODO)
│   ├── pricing.tsx           # /pricing          (Sprint 3 — TODO)
│   └── api/                  # TanStack Start server functions
│       ├── auth.ts           # Auth helpers      (Sprint 2 — TODO)
│       ├── checkout.ts       # Stripe checkout   (Sprint 3 — TODO)
│       ├── stripe-webhook.ts # Stripe webhooks   (Sprint 3 — TODO)
│       ├── ats-score.ts      # ATS scoring       (Sprint 4 — TODO)
│       ├── ai-edit.ts        # AI auto-edit      (Sprint 4 — TODO)
│       └── cover-letter.ts   # Cover letter      (Sprint 5 — TODO)
│
├── components/
│   ├── builder/             # Form sections + preview
│   │   ├── sections/        # PersonalSection, ExperienceSection, etc.
│   │   ├── Field.tsx         # Label + hint wrapper
│   │   ├── PhotoUpload.tsx   # Image upload with canvas resize
│   │   ├── PreviewPanel.tsx  # Template picker + live preview
│   │   ├── Section.tsx       # Accordion-style section card
│   │   ├── StepProgress.tsx  # Progress bar + step pills
│   │   └── TagInput.tsx      # Tag input with suggestions
│   ├── templates/           # Visual resume templates (browser only)
│   │   ├── registry.ts       # TEMPLATES array — add new templates here
│   │   ├── ResumeRenderer.tsx# Resolves template by id, wraps in A4 container
│   │   ├── utils.ts          # formatDate(), dateRange(), hasAny()
│   │   └── *.tsx             # 11 template components
│   └── ui/                  # shadcn/ui components (do not edit these)
│
├── lib/
│   ├── pdf/
│   │   ├── ResumePDF.tsx     # @react-pdf/renderer Document — ATS-safe export
│   │   └── PDFDownloadButton.tsx  # Reusable download button (variant + size props)
│   ├── resume-store.ts       # useResumeStore() hook — localStorage + (later) Supabase sync
│   └── utils.ts              # cn() helper
│
├── hooks/                   # Reusable hooks (create here, not inline in components)
│   ├── use-mobile.tsx        # useIsMobile()
│   ├── use-user.ts           # useUser() — Supabase auth state  (Sprint 2 — TODO)
│   └── use-subscription.ts  # useSubscription() — tier gating   (Sprint 3 — TODO)
│
├── services/                # Business logic — no UI code here
│   ├── parser/              # Client-side CV file parsing        (Sprint 4 — TODO)
│   │   ├── parseDocx.ts     # mammoth browser build → ResumeData
│   │   └── parsePdf.ts      # pdfjs-dist → ResumeData
│   └── scoring/             # ATS scoring helpers                (Sprint 4 — TODO)
│       └── scoreResume.ts   # keyword match → numeric score
│
└── types/
    └── resume.ts            # All domain types: ResumeData, Experience, etc.
```

---

## Key Types

All in `src/types/resume.ts`. Read before touching any data.

```ts
ResumeData          // Root — what gets saved, passed to templates, exported to PDF
PersonalDetails     // name, title, email, phone, location, photo (data URL), links[]
Experience          // id, role, venue, location, startDate, endDate, current, description
Education           // id, school, degree, field, startDate, endDate, description
Certification       // id, name, issuer, year
Hospitality         // serviceStyles[], posSystems[], wineKnowledge, spiritsKnowledge, languages[], allergens, foodSafety
```

When adding new types (User, Subscription, ATSScore, etc.) add them to `src/types/` in a new file, not to `resume.ts`.

---

## Routing Conventions

TanStack Router. File = route. Key patterns:

```ts
// New page route
export const Route = createFileRoute('/my-route')({
  component: MyPage,
});

// Route with auth guard
export const Route = createFileRoute('/dashboard')({
  beforeLoad: async ({ context }) => {
    if (!context.user) throw redirect({ to: '/sign-in' });
  },
  component: DashboardPage,
});

// Server function (API route) — runs on Cloudflare Workers
import { createServerFn } from '@tanstack/react-start';
export const myAction = createServerFn({ method: 'POST' })
  .validator((data: unknown) => MySchema.parse(data))
  .handler(async ({ data }) => {
    // server-only code here
  });
```

---

## Component Rules

1. One component per file. File name = component name in kebab-case.
2. Props interface defined at the top of the file, named `Props`.
3. No business logic in components — call hooks or services.
4. Every async operation needs a loading state and an error state.
5. `cn()` from `@/lib/utils` for conditional Tailwind classes.
6. Use shadcn/ui components from `@/components/ui/` — do not rebuild them.
7. Never put `useEffect` data-fetching inside a component — use TanStack Query.

```ts
// ✅ Good
function ExperienceSection({ data, onChange }: Props) { ... }

// ❌ Bad — mixed concerns
function ExperienceSection({ userId }: { userId: string }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch('/api/resume').then(...) }, [userId]);
}
```

---

## Supabase Patterns

See `docs/supabase.md` for full schema and RLS.

```ts
// Client init — src/lib/supabase.ts (to be created in Sprint 2)
import { createClient } from '@supabase/supabase-js';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
);

// In a server function — use service role key, never expose to client
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
```

Public variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
Private variables (server functions only): `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

---

## Cloudflare Workers Constraints

Server functions run on V8 isolates — not Node.js. This means:

- ✅ `fetch`, `crypto.subtle`, `Response`, `Request` — all available
- ❌ `fs`, `path`, `Buffer` — not available (use `Uint8Array` instead)
- ❌ mammoth, pdfjs-dist — must run client-side only
- ⚠️ Stripe webhooks: use `stripe.webhooks.constructEventAsync()` (Web Crypto API version)
- ⚠️ Claude API: fine — it's just `fetch` under the hood

---

## PDF Export

Two layers — keep them separate:

| Layer | Purpose | File |
|---|---|---|
| Visual templates | Browser preview only — HTML + Tailwind | `src/components/templates/*.tsx` |
| PDF export | ATS-safe, downloadable PDF — react-pdf primitives | `src/lib/pdf/ResumePDF.tsx` |

To add a new template, only add it to `src/components/templates/` and register in `registry.ts`. The PDF template is shared (single clean layout for all templates). Do not try to replicate visual template designs in react-pdf — it is intentionally simpler and ATS-safe.

`PDFDownloadButton` props: `data: ResumeData`, `variant?: "default" | "outline" | "ghost"`, `size?: "sm" | "default"`.

---

## ATS Scoring (Sprint 4)

Keywords live in Supabase table `role_keywords`. Scoring happens in two stages:

1. **Client** — keyword match (no AI cost): `services/scoring/scoreResume.ts`
2. **Server function** `/api/ats-score` — Claude Haiku refines score and writes feedback

Never send the raw file to Claude. Parse client-side first, send plain text only.
Never call Claude from the browser directly — API key must stay in server functions.

---

## Subscription Gating Rules

- Free users: ATS score number + manual editor
- Pro users ($5/month): full keyword breakdown + AI auto-edit + cover letter
- **Gate server-side first** — check subscription status in the server function before calling Claude
- **Then gate client-side** — `useSubscription()` hook + `<SubscriptionGate>` component for UI
- Never rely on client-side gating alone — it can be bypassed

---

## Before You Write Any Code

1. Read the relevant files first — don't assume.
2. Check `src/types/resume.ts` before touching data shapes.
3. Check `docs/supabase.md` before writing any DB queries.
4. Check `docs/server-functions.md` before writing any server functions.
5. Run `npx tsc --noEmit` after changes — zero errors required.
6. If adding a new route, register it in `src/routeTree.gen.ts` (or run the router codegen).
