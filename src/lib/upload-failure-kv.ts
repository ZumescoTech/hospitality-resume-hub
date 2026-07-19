// upload-failure-kv.ts
// Server-only KV operations for upload failure logging.
// This file is NEVER imported from client-side code — only from server functions
// that transitively import it via the server bundle.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is a runtime-only module
import { env as cfEnv } from 'cloudflare:workers';
import type { UploadFailureEntry, DailyUploadFailures } from '@/lib/upload-failure-types';

interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getKV(): KVStore | undefined {
  return (cfEnv as Record<string, unknown>)?.CV_RESULT_CACHE as KVStore | undefined;
}

const METRICS_TTL = 90 * 24 * 60 * 60;
const MAX_ENTRIES_PER_DAY = 200;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const REASON_CODES = [
  'no_text_layer', 'encrypted_pdf', 'corrupted_pdf', 'password_protected',
  'file_too_large', 'too_many_pages', 'legacy_doc', 'unsupported_mime',
  'extraction_garbled', 'insufficient_text', 'mammoth_failure',
  'pdfjs_internal_error', 'filereader_error', 'client_timeout',
  'ocr_timeout', 'parser_exception',
] as const;

export async function writeUploadFailure(entry: UploadFailureEntry): Promise<boolean> {
  const kv = getKV();
  if (!kv) return false;

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

  return true;
}

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
