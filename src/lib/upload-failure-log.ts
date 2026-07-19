// upload-failure-log.ts
// Server function to record client-side upload/extraction failures in KV.
// Fire-and-forget — failures to log never affect the user flow.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { UploadFailureEntry, DailyUploadFailures } from '@/lib/upload-failure-types';

const LogSchema = z.object({
  sessionId: z.string().min(1),
  reasonCode: z.string().min(1),
  stage: z.string().optional(),
  fileMeta: z.object({
    size: z.number(),
    mimeType: z.string(),
    extension: z.string(),
    pageCount: z.number().nullable().optional(),
  }),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  timestamp: z.string(),
});

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getKV(): KVStore | undefined {
  try {
    // Dynamic import to avoid client-side bundling of cloudflare:workers
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cfEnv = require('cloudflare:workers').env;
    return (cfEnv as Record<string, unknown>)?.CV_RESULT_CACHE as KVStore | undefined;
  } catch {
    return undefined;
  }
}

const METRICS_TTL = 90 * 24 * 60 * 60;
const MAX_ENTRIES_PER_DAY = 200;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logUploadFailure = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<{ ok: boolean }> => {
  try {
    const entry = LogSchema.parse(ctx.data);
    const kv = getKV();
    if (!kv) return { ok: false };

    const date = today();

    // 1. Append to the daily failures list
    const listKey = `upload_failures:${date}:list`;
    const raw = await kv.get(listKey);
    const entries: UploadFailureEntry[] = raw ? JSON.parse(raw) : [];

    if (entries.length >= MAX_ENTRIES_PER_DAY) {
      entries.shift();
    }
    entries.push(entry);
    await kv.put(listKey, JSON.stringify(entries), { expirationTtl: METRICS_TTL });

    // 2. Increment per-reasonCode counter
    const counterKey = `upload_failures:${date}:count:${entry.reasonCode}`;
    const countRaw = await kv.get(counterKey);
    const current = countRaw ? Number(countRaw) : 0;
    await kv.put(counterKey, String(current + 1), { expirationTtl: METRICS_TTL });

    // 3. Increment total failure counter
    const totalKey = `upload_failures:${date}:total`;
    const totalRaw = await kv.get(totalKey);
    const totalCurrent = totalRaw ? Number(totalRaw) : 0;
    await kv.put(totalKey, String(totalCurrent + 1), { expirationTtl: METRICS_TTL });

    return { ok: true };
  } catch {
    return { ok: false };
  }
});

// ─── Read API (for dashboard) ────────────────────────────────────────────────

const REASON_CODES = [
  'no_text_layer', 'encrypted_pdf', 'corrupted_pdf', 'password_protected',
  'file_too_large', 'too_many_pages', 'legacy_doc', 'unsupported_mime',
  'extraction_garbled', 'insufficient_text', 'mammoth_failure',
  'pdfjs_internal_error', 'filereader_error', 'client_timeout',
  'ocr_timeout', 'parser_exception',
] as const;

export async function getUploadFailuresForDate(date: string): Promise<DailyUploadFailures> {
  const kv = getKV();
  if (!kv) return { date, total: 0, byReasonCode: {}, recentEntries: [] };

  try {
    const totalRaw = await kv.get(`upload_failures:${date}:total`);
    const total = totalRaw ? Number(totalRaw) : 0;

    const byReasonCode: Record<string, number> = {};
    for (const code of REASON_CODES) {
      const raw = await kv.get(`upload_failures:${date}:count:${code}`);
      const count = raw ? Number(raw) : 0;
      if (count > 0) byReasonCode[code] = count;
    }

    const listRaw = await kv.get(`upload_failures:${date}:list`);
    const recentEntries: UploadFailureEntry[] = listRaw ? JSON.parse(listRaw) : [];

    return { date, total, byReasonCode, recentEntries };
  } catch {
    return { date, total: 0, byReasonCode: {}, recentEntries: [] };
  }
}
