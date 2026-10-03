# Session journal — staging deployment investigation

## Scope

Investigated this project's existing TanStack Start, Cloudflare Vite plugin,
Wrangler, package scripts, build outputs, and `CV_RESULT_CACHE` usage. The
initial investigation performed no deployment; the later staging deployment
and smoke checks are recorded at the end of this journal. No production
deployment/resource change or credential-value inspection was performed.

## Findings

- The project uses `@tanstack/react-start` with `@cloudflare/vite-plugin`
  (`vite.config.ts`). Installed versions: TanStack Start 1.167.39, Cloudflare
  Vite plugin 1.32.2, Wrangler 4.82.2 (provided transitively by the plugin).
- `npm run build` runs Vite's client and SSR builds. The Cloudflare plugin
  emits client assets in `dist/client/`, a Worker entry module at
  `dist/server/index.js`, worker chunks under `dist/server/assets/`, and a
  generated `dist/server/wrangler.json`. That generated config rewrites the
  entry to `index.js` and points the assets directory at `../client`.
- Root and staging Wrangler JSONC files are input configs to the Vite plugin.
  Direct `wrangler deploy --config wrangler.staging.jsonc` bypassed the Vite
  build output and failed because Wrangler could not resolve the configured
  TanStack server entry from the source config. The package export exists;
  it is the generated Vite artifact that must be deployed.
- Cloudflare's TanStack Start and Vite plugin guides document this source
  config → generated output config flow. The installed plugin API supports
  `configPath`; the Vite config now selects the standalone staging input when
  building with `--mode staging`.
- `CV_RESULT_CACHE` is used by `kv-cache.ts` for 30-day score-result caching,
  `telemetry.ts` for daily checker counters/histograms/latency samples, and
  `upload-failure-kv.ts` for upload-failure counts and recent diagnostic
  entries (90-day TTL). All handle an absent binding: cache operations no-op,
  telemetry is not persisted/reads as zero, and upload-failure logging
  returns false/empty data. KV is not required for core scoring but is
  required for these persistence/observability features.
- The staging namespace ID had been a placeholder, and the staging config
  temporarily omitted the binding. The owner provisioned a dedicated namespace
  (`fe46b47db26245328ea464006925ecc8`); `wrangler.staging.jsonc` now binds it
  exactly once as `CV_RESULT_CACHE`. This preserves staging cache, metrics,
  and upload-failure diagnostics without referencing production KV.

## Local changes

- `vite.config.ts`: use `wrangler.staging.jsonc` as the Cloudflare plugin
  input for Vite mode `staging`.
- `package.json`: deploy scripts target `dist/server/wrangler.json`, the
  generated config; added `build:staging` and `deploy:staging`.
- `wrangler.staging.jsonc`: replaced the absent/placeholder staging binding
  with the owner-provisioned staging KV ID. Production `wrangler.jsonc` was
  not modified.
- `docs/project/PROJECT_STATUS.md`: recorded deployment validation status and
  current limitation.

## Commands and results

- Inspected `package.json`, `vite.config.ts`, both Wrangler configs, generated
  build output, installed package versions, source KV call sites, and the
  installed Cloudflare plugin type declaration.
- `npx wrangler --version`: Wrangler 4.82.2.
- `npx wrangler whoami`: failed with 400 / not logged in. No account or remote
  state was queried successfully.
- `npx wrangler deploy --help`: confirmed local CLI supports `--config` and
  `--dry-run`.
- A previous direct source-config dry-run failed:
  `The entry-point file at "@tanstack\\react-start\\server-entry" was not found.`
  That command used the source config instead of the Vite-generated deploy
  config; the package export itself is present.
- Initial staging build and dry-run with the placeholder KV binding passed
  package validation but showed the placeholder bound as a KV namespace.
- After selecting the staging config during Vite build and omitting the
  placeholder KV binding, `npm run build:staging` passed and
  `npx wrangler deploy --dry-run --config dist/server/wrangler.json` passed.
  Dry-run showed Worker `hospitality-resume-hub-staging`, `index.js` entry,
  client assets, `ENVIRONMENT="staging"`, and no KV binding. It did not deploy.
- `npm run build` passed, and a production artifact
  `npx wrangler deploy --dry-run --config dist/server/wrangler.json` passed.
  Dry-run showed the production Worker name and configured production KV
  binding. Neither dry-run authenticated or changed remote state.
- Both Vite builds emitted existing warnings: large client chunks, and
  `@react-pdf`/`fontkit` SSR export warnings. Builds still exited successfully.
- `node -e` JSON parsing for `package.json` and the generated Wrangler config
  passed; `git diff --check` passed. Prettier check reported formatting
  differences in the selected existing project/config files; the new session
  journal was formatted and its individual Prettier check passed. No broad
  formatting was applied.
- In the follow-up staging setup, `npx wrangler kv namespace list` confirmed
  the staging namespace exists (metadata only).
- `npm run build` passed, followed by `npm run build:staging`.
- A generated-config assertion verified the staging Worker name,
  `ENVIRONMENT="staging"`, one total KV binding, one `CV_RESULT_CACHE`
  binding, and the configured staging KV ID.
- `npx wrangler deploy --dry-run --config dist/server/wrangler.json` passed.
  Wrangler reported exactly one KV binding with the staging ID, the AI
  binding, and `ENVIRONMENT="staging"`. This was a package/configuration
  dry-run only; no deployment occurred.
- Wrangler authentication had since been completed sufficiently to list KV
  namespaces. No production deployment or production resource operation was
  performed.
- Cloudflare docs checked:
  [TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/),
  [Vite plugin](https://developers.cloudflare.com/workers/vite-plugin/),
  [Cloudflare environments](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/),
  [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/),
  [Workers KV](https://developers.cloudflare.com/kv/).

## Staging deployment and smoke checks (2026-09-30)

### Secret handling

- The active worktree did not contain `.env`. Checked the adjacent primary
  checkout's existing `.env` without displaying values and confirmed
  `GROQ_API_KEY` was present and non-placeholder.
- Added `.staging.secrets.env` to `.gitignore` and verified the ignore rule
  with `git check-ignore -v`.
- Copied only `GROQ_API_KEY` into the temporary secrets file; no
  `GEMINI_API_KEY` was present to include. Verified the variable name only.
  Applied and checked a Windows ACL granting full control only to the current
  user and SYSTEM.
- Removed the temporary staging secrets file after deployment; it was never
  committed. The `.gitignore` rule remains.

### Deployment

- Verified `npx wrangler whoami` succeeded and the authenticated account
  listed the intended staging KV namespace. No account identity or secret
  value was recorded.
- Rebuilt the current staging artifact with `npm run build:staging`; passed.
- Verified `dist/server/wrangler.json` targets
  `hospitality-resume-hub-staging`, has `ENVIRONMENT="staging"`, and binds
  exactly one `CV_RESULT_CACHE` to the dedicated staging KV namespace.
- Repeated `npx wrangler deploy --dry-run --config dist/server/wrangler.json`;
  passed and showed the intended staging binding.
- Deployed with:

  `npx wrangler deploy --config dist/server/wrangler.json --secrets-file .staging.secrets.env`

- Deployment succeeded. Wrangler reported all assets uploaded and published
  staging Worker version `4835773c-5f29-45c8-9c7a-1ffaf935e6e9`.
- `npx wrangler secret list --config dist/server/wrangler.json --format json`
  confirmed the secret name `GROQ_API_KEY` on the staging Worker; values were
  not displayed. No Gemini fallback secret is configured.
- Staging URL: <https://hospitality-resume-hub-staging.madzunguruset.workers.dev>
- No production deployment or production resource operation occurred.

### Basic runtime smoke checks

- `GET /`: HTTP 200, GetHired app marker present, no immediate error markers.
- `GET /tools/cruise-cv-checker`: HTTP 200, GetHired app marker present, no
  immediate error markers.
- No runtime error was observed in these basic responses. No authenticated
  AI request or full Release 0.1 QA suite was run.

### Warnings and remaining blockers

- Deployment completed without an error. Staging build emitted existing
  warnings: deprecated Node `punycode`, large client chunks, and `@react-pdf` /
  `fontkit` SSR export warnings.
- Staging is **STAGING DEPLOYED**. Release readiness remains **NOT READY**:
  existing P0 issues and full Release 0.1 QA remain outstanding.
