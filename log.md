# Error Log

Tracking runtime errors encountered in production and their resolutions.

---

## 1. "require is not defined" in server function (2026-07-19)

**Error:**
```
Uncaught Error: require is not defined
  at Object.deserialize (index-CPBeP5oo.js:12:22141)
```
Logged as `reasonCode: "parser_exception"` in the client console.

**Root cause:**
`src/lib/upload-failure-log.ts` used `require('cloudflare:workers')` inside `getKV()`.
This file is imported in the route component (`cruise-cv-checker.tsx`), so TanStack Start
bundles it for both client and server. For the client, only a stub is created (RPC call).
For the server, Vite produces an ESM bundle where `require()` is not defined — Cloudflare
Workers use ESM modules, and even with `nodejs_compat`, `require` doesn't work for
Cloudflare-specific modules in ESM context.

**Fix:**
Split into two files:
- `upload-failure-log.ts` — client-safe, contains only `createServerFn` + zod schema,
  uses `await import('@/lib/upload-failure-kv')` inside the handler (dynamic import
  only runs server-side at call time).
- `upload-failure-kv.ts` — server-only, uses `import { env } from 'cloudflare:workers'`
  (static ESM import, properly externalized by Cloudflare Vite plugin for server chunks).

**Prevention rule:**
Any file imported in a route/component must NEVER contain `require()` or static imports
of `cloudflare:workers`. If a `createServerFn` needs Cloudflare bindings, use dynamic
`await import()` inside the handler body, pointing to a server-only module.

**Related files:**
- `src/lib/telemetry.ts` — uses static `import { env } from 'cloudflare:workers'`
  (safe because it's only imported by `cruise-cv-check.ts`, a pure server-function file)
- `src/lib/metrics-api.ts` — same pattern, only imported by `metrics.tsx` route which
  calls server functions but doesn't import cloudflare modules directly

---

## 2. React error #419 — Hydration mismatch (2026-07-19)

**Error:**
```
Uncaught Error: Minified React error #419
```

**Root cause:**
Browser extension (MozBar) injects DOM elements before React hydration, causing
server-rendered HTML to not match the client DOM. This is NOT a code bug.

**Status:** Not actionable — caused by third-party browser extension. Users with
extensions may see this in the console but it does not affect functionality.

**Prevention:** If we see this in error monitoring at scale, consider wrapping the
app in `<React.StrictMode>` suppressHydrationWarning or using client-only rendering
for the affected subtree.

---

## Pattern: Safe Cloudflare Workers module imports

```
SAFE in server-only files (never imported by components):
  import { env } from 'cloudflare:workers';

SAFE in createServerFn handler body (file imported by components):
  const { env } = await import('cloudflare:workers');
  // OR: import a helper from a server-only file
  const { helper } = await import('@/lib/my-server-only-module');

UNSAFE (will break at runtime):
  require('cloudflare:workers')  // require doesn't exist in ESM Workers

UNSAFE (will break client build):
  // In a file imported by a component:
  import { env } from 'cloudflare:workers';  // Vite can't resolve for client
```
