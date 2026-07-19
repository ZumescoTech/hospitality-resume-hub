// telemetry.ts
// Lightweight server-side telemetry for the CV checker pipeline.
// Stores daily counters and histograms in KV (CV_RESULT_CACHE binding, `metrics:` prefix).
// All operations are fire-and-forget — telemetry failures never affect the user flow.
//
// Metrics tracked:
//   1. Parse failure rate (parse_failed + insufficient_content per day)
//   2. Score distribution (bucketed histogram: 0-10, 10-20, ..., 90-100)
//   3. Judge API error rate (by outcome: rate_limit, server_error, bad_json, exhausted)
//   4. p95 latency (upload → score) — stored as individual samples, computed on read
//   5. Photo check failure rate (placeholder for when photo compliance is added)

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is a runtime-only module
import { env as cfEnv } from 'cloudflare:workers';

// ─── KV access ───────────────────────────────────────────────────────────────

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getKV(): KVStore | undefined {
  return (cfEnv as Record<string, unknown>)?.CV_RESULT_CACHE as KVStore | undefined;
}

/** Metrics expire after 90 days — no unbounded growth. */
const METRICS_TTL = 90 * 24 * 60 * 60;

function today(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

// ─── Counter helpers ─────────────────────────────────────────────────────────

interface DailyCounters {
  [key: string]: number;
}

async function incrementCounter(key: string, amount = 1): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    const fullKey = `metrics:${today()}:${key}`;
    const raw = await kv.get(fullKey);
    const current = raw ? Number(raw) : 0;
    await kv.put(fullKey, String(current + amount), { expirationTtl: METRICS_TTL });
  } catch { /* non-fatal */ }
}

async function getCounter(date: string, key: string): Promise<number> {
  const kv = getKV();
  if (!kv) return 0;
  try {
    const raw = await kv.get(`metrics:${date}:${key}`);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

// ─── Score histogram ─────────────────────────────────────────────────────────

function scoreBucket(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const bucket = Math.floor(clamped / 10) * 10;
  return `score_${bucket}`;
}

// ─── Latency samples ─────────────────────────────────────────────────────────
// Store recent latency samples as a JSON array (capped to last 100 per day).

async function recordLatency(ms: number): Promise<void> {
  const kv = getKV();
  if (!kv) return;
  try {
    const key = `metrics:${today()}:latency_samples`;
    const raw = await kv.get(key);
    const samples: number[] = raw ? JSON.parse(raw) : [];
    samples.push(ms);
    // Keep last 100 samples per day (sufficient for p95 with low traffic MVP)
    const trimmed = samples.slice(-100);
    await kv.put(key, JSON.stringify(trimmed), { expirationTtl: METRICS_TTL });
  } catch { /* non-fatal */ }
}

// ─── Public API: record events ───────────────────────────────────────────────

export type CheckOutcomeKind = 'scored' | 'parse_failed' | 'insufficient_content';
export type ApiOutcome = 'ok' | 'rate_limit' | 'server_error' | 'bad_json' | 'exhausted';

/** Record the outcome of a CV check (call after every check completes). */
export function recordCheckOutcome(kind: CheckOutcomeKind, score?: number): void {
  void incrementCounter(`outcome_${kind}`);
  void incrementCounter('checks_total');

  if (kind === 'scored' && score != null) {
    void incrementCounter(scoreBucket(score));
  }
}

/** Record a Judge API attempt outcome (call from the router per attempt). */
export function recordApiAttempt(provider: string, outcome: ApiOutcome, ms: number): void {
  void incrementCounter(`api_${outcome}`);
  void incrementCounter(`api_${provider}_${outcome}`);
  if (outcome !== 'ok') {
    void incrementCounter('api_errors');
  }
}

/** Record end-to-end latency for a scored check (upload → response). */
export function recordLatencyMs(ms: number): void {
  void recordLatency(ms);
}

// ─── Public API: read metrics (for dashboard endpoint) ───────────────────────

export interface DailyMetrics {
  date: string;
  checksTotal: number;
  parseFailures: number;
  insufficientContent: number;
  scored: number;
  scoreDistribution: Record<string, number>;
  apiErrors: number;
  apiOutcomes: Record<string, number>;
  latencyP50: number | null;
  latencyP95: number | null;
}

export async function getMetricsForDate(date: string): Promise<DailyMetrics> {
  const kv = getKV();

  const checksTotal = await getCounter(date, 'checks_total');
  const parseFailures = await getCounter(date, 'outcome_parse_failed');
  const insufficientContent = await getCounter(date, 'outcome_insufficient_content');
  const scored = await getCounter(date, 'outcome_scored');
  const apiErrors = await getCounter(date, 'api_errors');

  // Score distribution
  const scoreDistribution: Record<string, number> = {};
  for (let bucket = 0; bucket <= 90; bucket += 10) {
    const count = await getCounter(date, `score_${bucket}`);
    if (count > 0) scoreDistribution[`${bucket}-${bucket + 10}`] = count;
  }

  // API outcomes
  const apiOutcomes: Record<string, number> = {};
  for (const outcome of ['ok', 'rate_limit', 'server_error', 'bad_json', 'exhausted'] as const) {
    const count = await getCounter(date, `api_${outcome}`);
    if (count > 0) apiOutcomes[outcome] = count;
  }

  // Latency percentiles
  let latencyP50: number | null = null;
  let latencyP95: number | null = null;
  if (kv) {
    try {
      const raw = await kv.get(`metrics:${date}:latency_samples`);
      if (raw) {
        const samples = (JSON.parse(raw) as number[]).sort((a, b) => a - b);
        if (samples.length > 0) {
          latencyP50 = samples[Math.floor(samples.length * 0.5)];
          latencyP95 = samples[Math.floor(samples.length * 0.95)];
        }
      }
    } catch { /* non-fatal */ }
  }

  return {
    date,
    checksTotal,
    parseFailures,
    insufficientContent,
    scored,
    scoreDistribution,
    apiErrors,
    apiOutcomes,
    latencyP50,
    latencyP95,
  };
}
