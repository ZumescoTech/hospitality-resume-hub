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

Cloudflare Workers keeps previous deployments. Rollback via:
```bash
npx wrangler rollback
```
Or from the Cloudflare dashboard: Workers → Deployments → Roll back.

**Target:** rollback should complete in < 60 seconds.

## Re-scoring previously affected CVs

When the scoring engine is fixed (e.g. the 0/100 bug), affected users' cached
scores are stale. The cache is automatically invalidated by `SCORING_VERSION`:

1. **Bump `SCORING_VERSION`** in `src/lib/cruiseCvRubric.ts`
2. Deploy — all cache keys are salted with this version, so old entries are
   never looked up again
3. Users get fresh scores on their next check (no manual purge needed)

Old KV entries with the previous version naturally expire after 30 days.

## Telemetry dashboard

Metrics are stored in KV with `metrics:YYYY-MM-DD:` prefix. Read via:
```ts
import { getMetrics } from '@/lib/metrics-api';
const last7Days = await getMetrics({ data: { days: 7 } });
```

### Key alerts (check daily)

| Metric | Healthy | Investigate |
|--------|---------|-------------|
| Parse failure rate | < 5% of checks | > 10% = new file format breaking parsing |
| Score cluster near 0 | < 2% in 0-10 bucket | > 5% = possible scoring regression |
| API error rate | < 5% | > 15% = provider issue, check if degraded mode firing |
| p95 latency | < 8s | > 15s = provider slowdown or timeout issues |

## Secrets

Managed via Cloudflare Worker secrets (never in code):
```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put GOOGLE_SHEETS_LEAD_WEBHOOK_URL
```

## Staging KV setup (one-time)

```bash
npx wrangler kv namespace create CV_RESULT_CACHE_STAGING
# Copy the returned ID into wrangler.staging.jsonc
```
