# Operations Runbook — GetHired

Quick reference for deployment, rollback, and incident response.

## Environments

| Environment | Worker name | KV namespace | Config |
|-------------|-------------|--------------|--------|
| Production | `hospitality-resume-hub` | `2944ed03...` | `wrangler.jsonc` |
| Staging | `hospitality-resume-hub-staging` | (separate) | `wrangler.staging.jsonc` |

### Deploy to staging
```bash
npm run deploy:staging
```

### Deploy to production
```bash
npm run deploy
```

Builds select the source configuration in Vite and generate `dist/server/wrangler.json`.
For local staging validation, run `npm run build:staging`, then
`npx wrangler deploy --dry-run --config dist/server/wrangler.json`.
Check the generated Worker name and KV binding before deployment; a subsequent
production build replaces the same output directory. Do not commit `dist/`.

## Rollback

```bash
npx wrangler rollback
```

## Secrets

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put LEAD_NOTIFY_WEBHOOK_URL
npx wrangler secret put LEAD_NOTIFY_EMAIL
```

The retired Google Sheets webhook is not used by the application or deploy
workflow. Its remote Worker secret cleanup remains an operator follow-up recorded
in the ISSUE-017 closure journal; no remote cleanup was performed here.

## GetHired CRM (Supabase)

Leads live in isolated tables on the existing Supabase project:

- `public.gethired_leads`
- `public.gethired_lead_events`

Do **not** write these into the wine-club `members` table.

Marketing is WhatsApp-native: each row stores `wa_me_url`. Open that link in
WhatsApp Business (free app). No Cloud API cost. First outreach is a click-to-chat
thread, not a template blast.
