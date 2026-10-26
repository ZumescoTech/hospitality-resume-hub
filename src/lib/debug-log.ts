// debug-log.ts
// TEMPORARY debug log capture for the /tools/logs page.
//
// Server: wraps console.* so every server log line is buffered, then flushed
// to KV (CV_RESULT_CACHE binding, `debuglog:` prefix) at the end of each request.
// Client: browser errors are posted in via reportClientLogs (debug-log-api.ts).
//
// Gated by DEBUG_LOGS_ENABLED=true. Every message is sanitised before storage:
// emails, phone numbers and API keys are redacted and lines are truncated.
// Entries expire after 3 days.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is a runtime-only module; vitest resolves to a stub
import { env as cfEnv } from 'cloudflare:workers';

export type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';
export type LogSource = 'server' | 'client';

export interface DebugLogEntry {
  ts: string;
  level: LogLevel;
  source: LogSource;
  message: string;
}

const KEY_PREFIX = 'debuglog:';
const TTL_SECONDS = 3 * 24 * 60 * 60;
const MAX_MESSAGE_CHARS = 1000;
const MAX_BUFFERED = 200;
// Keys sort newest-first: KV lists keys in ascending lexicographic order.
const MAX_TS = 9_999_999_999_999;

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  list(options: { prefix: string; limit?: number }): Promise<{ keys: Array<{ name: string }> }>;
}

function getKV(): KVStore | undefined {
  return (cfEnv as Record<string, unknown>)?.CV_RESULT_CACHE as KVStore | undefined;
}

export function isDebugLogsEnabled(): boolean {
  return process.env.DEBUG_LOGS_ENABLED === 'true';
}

// ─── Sanitising ───────────────────────────────────────────────────────────────

/** Redact personal data and secrets, collapse whitespace, truncate. */
export function sanitizeLogMessage(raw: string): string {
  return raw
    .replace(/key=[^&\s"']+/gi, 'key=REDACTED')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, 'Bearer REDACTED')
    .replace(/\b(gsk_|AIza|sk-)[A-Za-z0-9_-]{8,}/g, '$1REDACTED')
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    const stack = arg.stack?.split('\n').slice(1, 4).join(' | ') ?? '';
    return `${arg.name}: ${arg.message}${stack ? ` | ${stack}` : ''}`;
  }
  if (typeof arg === 'string') return arg;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

export function formatLogArgs(args: unknown[]): string {
  return sanitizeLogMessage(args.map(formatArg).join(' '));
}

// ─── Buffer ───────────────────────────────────────────────────────────────────

let buffer: DebugLogEntry[] = [];

export function pushDebugLog(level: LogLevel, source: LogSource, message: string): void {
  if (!isDebugLogsEnabled()) return;
  buffer.push({ ts: new Date().toISOString(), level, source, message: sanitizeLogMessage(message) });
  if (buffer.length > MAX_BUFFERED) buffer = buffer.slice(-MAX_BUFFERED);
}

/** Test seam. */
export function drainDebugLogBuffer(): DebugLogEntry[] {
  const out = buffer;
  buffer = [];
  return out;
}

// ─── Console capture (server) ─────────────────────────────────────────────────

let installed = false;
const LEVELS: LogLevel[] = ['debug', 'info', 'log', 'warn', 'error'];

/** Wrap console.* once per isolate. Originals still run, so wrangler tail is unaffected. */
export function installConsoleCapture(): void {
  if (installed) return;
  installed = true;
  for (const level of LEVELS) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      try {
        pushDebugLog(level, 'server', formatLogArgs(args));
      } catch {
        // Logging must never break a request.
      }
    };
  }
}

// ─── KV persistence ───────────────────────────────────────────────────────────

/** Write buffered entries to KV as one batch. Silent no-op without KV. */
export async function flushDebugLogs(): Promise<void> {
  if (!isDebugLogsEnabled() || buffer.length === 0) return;
  const kv = getKV();
  const entries = drainDebugLogBuffer();
  if (!kv) return;
  const key = `${KEY_PREFIX}${String(MAX_TS - Date.now()).padStart(13, '0')}:${Math.random().toString(36).slice(2, 8)}`;
  try {
    await kv.put(key, JSON.stringify(entries), { expirationTtl: TTL_SECONDS });
  } catch {
    // KV write failures are dropped — never surface them to the request.
  }
}

/** Newest-first entries from the most recent `batches` flushes. */
export async function readDebugLogs(batches = 100): Promise<DebugLogEntry[]> {
  const kv = getKV();
  if (!kv) return [];
  const { keys } = await kv.list({ prefix: KEY_PREFIX, limit: batches });
  const values = await Promise.all(keys.map((k) => kv.get(k.name)));
  const entries: DebugLogEntry[] = [];
  for (const raw of values) {
    if (!raw) continue;
    try {
      entries.push(...(JSON.parse(raw) as DebugLogEntry[]));
    } catch {
      // Skip corrupt batches.
    }
  }
  return entries.sort((a, b) => b.ts.localeCompare(a.ts));
}
