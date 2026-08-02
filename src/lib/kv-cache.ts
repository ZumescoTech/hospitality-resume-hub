// kv-cache.ts
// KV result cache for CV check results.
//
// Cache key: `check:{SCORING_VERSION}[:{roleSlug}]:{textHash}[:{jdHash}]`
//   - roleSlug  = app role slug (scoring is role-conditional, so the same CV
//                 scores differently per role — the role MUST be part of the key)
//   - textHash  = SHA-256 of normalised CV text (trim, collapse whitespace, lowercase)
//   - jdHash    = SHA-256 of normalised job description (when provided)
//   - SCORING_VERSION from cruiseCvRubric salts the key so bumped versions auto-bust
//
// Bindings:
//   KV namespace `CV_RESULT_CACHE` bound in wrangler.jsonc.
//   TTL: 30 days (2 592 000 seconds).
//   If the binding is absent (local dev, tests) all operations are silent no-ops.

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is a runtime-only module; vitest resolves to a stub
import { env as cfEnv } from 'cloudflare:workers';

import { SCORING_VERSION } from '@/lib/cruiseCvRubric';
import type { CvScoreResult } from '@/lib/cruiseCvRubric';

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

// Minimal interface — avoids depending on @cloudflare/workers-types
interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

function getBinding(): KVStore | undefined {
  return (cfEnv as Record<string, unknown>)?.CV_RESULT_CACHE as KVStore | undefined;
}

// ─── Key derivation ───────────────────────────────────────────────────────────

/** Normalise text for hashing: trim, collapse whitespace, lowercase. */
export function normaliseForHash(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * Compute a hex SHA-256 of a string.
 * Uses the Web Crypto API (available in Worker runtime, jsdom, and Node 18+).
 */
export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Build the KV cache key for a given CV + optional role + optional job
 * description. Key format: `check:{SCORING_VERSION}[:{roleSlug}]:{textHash}[:{jdHash}]`.
 *
 * The role slug is part of the key because scoring is role-conditional — the
 * same CV text yields different scores for, e.g., a sommelier vs a waiter — so
 * omitting it would serve one role's result for another. When no slug is given
 * the segment is dropped (back-compat with role-agnostic callers/tests).
 */
export async function buildCacheKey(
  cvText: string,
  jobDescription?: string,
  roleSlug?: string,
): Promise<string> {
  const textHash = await sha256Hex(normaliseForHash(cvText));
  const prefix = roleSlug ? `check:${SCORING_VERSION}:${roleSlug}` : `check:${SCORING_VERSION}`;
  if (jobDescription?.trim()) {
    const jdHash = await sha256Hex(normaliseForHash(jobDescription));
    return `${prefix}:${textHash}:${jdHash}`;
  }
  return `${prefix}:${textHash}`;
}

// ─── Cache operations ─────────────────────────────────────────────────────────

export async function getCachedResult(key: string): Promise<CvScoreResult | null> {
  const kv = getBinding();
  if (!kv) return null;
  try {
    const raw = await kv.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as CvScoreResult;
  } catch {
    return null;
  }
}

export async function setCachedResult(key: string, result: CvScoreResult): Promise<void> {
  const kv = getBinding();
  if (!kv) return;
  try {
    await kv.put(key, JSON.stringify(result), { expirationTtl: CACHE_TTL_SECONDS });
  } catch {
    // Cache write failure is non-fatal — the result has already been returned.
  }
}
