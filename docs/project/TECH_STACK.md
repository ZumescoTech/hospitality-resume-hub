# Verified technology stack

2026-09-22; versions below are resolved in package-lock.json, not merely package.json ranges.

| Area | Implementation | Evidence |
|---|---|---|
| Frontend | React 19.2.5, TypeScript 5.9.3, TanStack Start 1.167.39, Router 1.168.21 | package-lock.json; src/router.tsx; src/routes |
| Rendering/routing | SSR Worker and hydrated client, generated file route tree | vite.config.ts; src/routes/__root.tsx; src/routeTree.gen.ts |
| Styling/UI | Tailwind 4.2.2, CSS variables, Radix/shadcn primitives, Lucide, Sonner; react-colorful | src/styles.css; src/components/ui and builder |
| Forms/state | Mostly controlled React state; Zod boundaries; custom ResumePersistence + useSyncExternalStore | resume-store.ts; resume-persistence.ts |
| Query library | TanStack React Query, used by dashboard; provider missing | dashboard.tsx; no QueryClientProvider in src |
| Backend | Cloudflare Workers, nodejs_compat, compatibility date 2025-09-24; TanStack createServerFn RPC | wrangler.jsonc; src/lib server functions |
| Database/auth | Supabase JS 2.108.0; Postgres Data API, email/password and Google OAuth | supabase.ts; sign-in/up; lead migration |
| ORM | None found; Supabase query builder | resume-store.ts; cruise-cv-check.ts |
| Cache/metrics | Workers KV CV_RESULT_CACHE | kv-cache.ts; telemetry.ts; upload-failure-kv.ts |
| AI | REST Groq llama-3.3-70b-versatile; Gemini gemini-2.5-flash; optional Workers AI @cf/meta/llama-3.3-70b-instruct-fp8-fast | src/lib/ai; default public checker calls none |
| Parsing | pdfjs-dist 4.10.38, Mammoth 1.12.0; lazy Tesseract 5.x English OCR; deterministic structured CV parser | extractCvText.ts; cvExtractDeterministic.ts |
| PDF output | @react-pdf/renderer; separate HTML template preview system | src/lib/pdf; src/components/templates |
| Analytics | Microsoft Clarity SDK + custom KV metrics; no Sentry/APM found | clarity.ts; telemetry.ts |
| Build | Vite 7.3.2, Cloudflare Vite plugin, TanStack/Tailwind/React plugins | vite.config.ts |
| Testing | Vitest 4.1.9, jsdom, Testing Library; Playwright 1.61.1 | vitest.config.ts; playwright.config.ts |
| Tooling | ESLint 9, Prettier, npm lockfile; CI uses latest Bun; Wrangler 4.82.2 transitively installed | package.json; deploy.yml |

No queues, independent REST API service, server actions in Next.js, dedicated object upload service, or application-managed Supabase Storage bucket were found. Public hero video references an R2 development URL; this is media hosting, not CV storage.

## Setup and safe inspection

Existing dependencies were checked with `npm ls --depth=0`, not reinstalled. Normally use the committed npm lockfile for reproducibility; CI currently uses `bun install` without a frozen Bun lockfile. Do not upgrade or install as an incidental audit step.

Use `.env.example` as the variable catalog, but its claim that all production variables are Worker secrets is incomplete: VITE values are compiled into the browser at build time. Worker secrets must also be available at runtime for server integrations. Do not copy real secrets into docs, logs or tickets.

For isolated local UI verification, PowerShell: `$env:GETHIRED_LOCAL_SAVE_TEST='1'` then `node node_modules/vite/bin/vite.js dev --host 127.0.0.1`. This existing mode replaces browser Supabase configuration with a synthetic origin and disables Clarity. It does **not** neutralize all server credentials loaded from .env; do not submit leads or invoke AI unnecessarily. AI bindings can still be remote. Use synthetic documents and mock account requests.

## Environment inventory

| Variable/binding | Purpose | Required | Client/server | In .env.example? |
|---|---|---|---|---|
| VITE_SUPABASE_URL | Browser database/auth URL; server lead URL fallback | Auth/cloud/CRM | Both; public URL | Yes |
| VITE_SUPABASE_ANON_KEY | Public client key; relies on RLS | Auth/cloud | Client | Yes |
| SUPABASE_URL | Alternate server lead URL | If no VITE URL at runtime | Server | No |
| SUPABASE_SERVICE_ROLE_KEY | Privileged CRM writes | CRM persistence | Server secret | Yes |
| GROQ_API_KEY | Builder extraction/assistance and paid checker | AI paths only | Server secret | Yes |
| GEMINI_API_KEY | Optional second provider | No | Server secret | Yes |
| WORKERS_AI_ENABLED | Enable third provider | No; off | Server flag | No |
| AI | Workers AI binding | Flagged fallback | Worker binding | Wrangler only |
| PRECHECK_ENABLED | Supplemental gates | No; production config true | Server flag | No |
| MERGED_CALL | Combined AI analysis/extraction | No; off | Server flag | No |
| HYBRID_EXTRACTION | Skip AI with high-confidence deterministic parse | No; off | Server flag | No |
| IMPORT_AI_ENRICH | Checker-to-builder enrichment | No; off | Server flag | No |
| CV_RESULT_CACHE | Score cache and metrics | Optional in code; desired deployment | Worker KV | Wrangler only |
| VITE_CLARITY_PROJECT_ID | Session replay/events | Measurement if enabled | Client public ID | Yes |
| GOOGLE_SHEETS_LEAD_WEBHOOK_URL | Lead fallback/notification | Optional | Server secret endpoint | Yes |
| LEAD_NOTIFY_WEBHOOK_URL | Lead notification endpoint | Optional | Server | Yes |
| LEAD_NOTIFY_EMAIL / LEAD_NOTIFY_FROM | Resend recipient/sender | Email notification only | Server | Yes |
| RESEND_API_KEY | Send CRM notifications | Email notification only | Server secret | Yes |
| VITE_WHATSAPP_BUSINESS_E164 | Documented but no source consumer found | No | Would be public | Yes, unused |
| GETHIRED_LOCAL_SAVE_TEST | Isolate browser test integrations | Local tests | Build/dev | No |
| BASE_URL / CI | E2E target and runner behavior | Optional | Test runtime | No |
| ENVIRONMENT | staging label; no application consumer found | No | Worker | No |
| CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID | CI deployment | Deployment only | CI | No |

No private secret in a VITE-prefixed variable was identified. URL and anon key are not authorization. Checked-in examples are placeholders. Local .env exists; only variable names were inspected. See [dependency inventory](DEPENDENCY_AUDIT.md) for package usage/security and [architecture](ARCHITECTURE.md) for privacy.

## Deployment limits

Production Worker: hospitality-resume-hub. Staging config still has REPLACE_WITH_STAGING_KV_ID. GitHub main push builds and deploys, then sets three secrets; no test/lint/typecheck/approval gate. Gemini and newer notification settings are not provisioned in that workflow. Actual deployed values, domains, RLS, edge rate limits and monitoring configuration were not inspected. gethired.app social metadata is explicitly TODO, not verified deployment evidence. OPERATIONS.md is retained as the existing runbook and needs correction before deployment.
