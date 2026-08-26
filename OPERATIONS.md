# Operations Runbook — GetHired

Quick reference for deployment, rollback, and incident response.

## Environments

| Environment | Worker name | KV namespace | Config |
|-------------|-------------|--------------|--------|
| Production | `hospitality-resume-hub` | `2944ed03...` | `wrangler.jsonc` |
| Staging | `hospitality-resume-hub-staging` | (separate) | `wrangler.staging.jsonc` |

### Deploy to staging
```bash
npx wrangler deploy --config wrangler.staging.jsonc
```

### Deploy to production
```bash
npx wrangler deploy
```

## Rollback

```bash
npx wrangler rollback
```

## Secrets

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_SHEETS_LEAD_WEBHOOK_URL
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
npx wrangler secret put VITE_SUPABASE_URL
npx wrangler secret put LEAD_NOTIFY_WEBHOOK_URL
npx wrangler secret put LEAD_NOTIFY_EMAIL
```

## GetHired CRM (Supabase)

Leads live in isolated tables on the existing Supabase project:

- `public.gethired_leads`
- `public.gethired_lead_events`

Do **not** write these into the wine-club `members` table.

Marketing is WhatsApp-native: each row stores `wa_me_url`. Open that link in
WhatsApp Business (free app). No Cloud API cost. First outreach is a click-to-chat
thread, not a template blast.
