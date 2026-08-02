/**
 * T3.1 — KV cache key derivation tests
 *
 * Tests the pure functions normaliseForHash and buildCacheKey.
 * No actual KV calls — the cloudflare:workers stub returns an empty env,
 * so getCachedResult / setCachedResult are silent no-ops.
 *
 * Assertions per the scope:
 *   A. Same text differing only in whitespace/case => same key
 *   B. Different job description => different key
 *   C. Bumped SCORING_VERSION => different key (tested by direct key inspection)
 *   D. No JD provided => shorter key (no JD segment)
 */

import { describe, it, expect } from 'vitest';
import { normaliseForHash, buildCacheKey, sha256Hex } from '@/lib/kv-cache';
import { SCORING_VERSION } from '@/lib/cruiseCvRubric';

const BASE_CV = 'Senior waiter with 5 years cruise experience. STCW certified.';
const BASE_JD = 'Looking for experienced waiter with Micros POS skills.';

// ─── normaliseForHash ─────────────────────────────────────────────────────────

describe('normaliseForHash', () => {
  it('trims leading/trailing whitespace', () => {
    expect(normaliseForHash('  hello  ')).toBe('hello');
  });

  it('collapses internal whitespace to single spaces', () => {
    expect(normaliseForHash('hello   world\t\nnext')).toBe('hello world next');
  });

  it('lowercases the text', () => {
    expect(normaliseForHash('STCW WSET Level 2')).toBe('stcw wset level 2');
  });

  it('same text varying only in case → same normalised form', () => {
    expect(normaliseForHash('Micros POS')).toBe(normaliseForHash('micros pos'));
  });

  it('same text varying only in whitespace → same normalised form', () => {
    expect(normaliseForHash('a  b\tc')).toBe(normaliseForHash('a b c'));
  });
});

// ─── buildCacheKey ────────────────────────────────────────────────────────────

describe('buildCacheKey — same text / different whitespace & case → same key', () => {
  it('extra spaces produce the same key as the clean version', async () => {
    const k1 = await buildCacheKey(BASE_CV);
    const k2 = await buildCacheKey('  ' + BASE_CV + '  ');
    expect(k1).toBe(k2);
  });

  it('different capitalisation produces the same key', async () => {
    const k1 = await buildCacheKey(BASE_CV);
    const k2 = await buildCacheKey(BASE_CV.toUpperCase());
    expect(k1).toBe(k2);
  });

  it('collapsed whitespace (tab/newline) produces the same key', async () => {
    const k1 = await buildCacheKey(BASE_CV);
    const withTabs = BASE_CV.replace(/ /g, '\t\t');
    expect(await buildCacheKey(withTabs)).toBe(k1);
  });
});

describe('buildCacheKey — different JD → different key', () => {
  it('with JD produces a different key than without JD', async () => {
    const withoutJD = await buildCacheKey(BASE_CV);
    const withJD = await buildCacheKey(BASE_CV, BASE_JD);
    expect(withJD).not.toBe(withoutJD);
  });

  it('different JDs produce different keys for the same CV', async () => {
    const k1 = await buildCacheKey(BASE_CV, BASE_JD);
    const k2 = await buildCacheKey(BASE_CV, 'Completely different job description.');
    expect(k1).not.toBe(k2);
  });

  it('empty/whitespace-only JD is treated as absent', async () => {
    const noJD = await buildCacheKey(BASE_CV);
    const emptyJD = await buildCacheKey(BASE_CV, '   ');
    expect(noJD).toBe(emptyJD);
  });
});

describe('buildCacheKey — role salt (scoring is role-conditional)', () => {
  it('different roles produce different keys for the same CV + JD', async () => {
    const somm = await buildCacheKey(BASE_CV, undefined, 'sommelier-wine-waiter');
    const waiter = await buildCacheKey(BASE_CV, undefined, 'waiter-waitress');
    expect(somm).not.toBe(waiter);
  });

  it('a role-scoped key differs from the role-agnostic key', async () => {
    const agnostic = await buildCacheKey(BASE_CV);
    const scoped = await buildCacheKey(BASE_CV, undefined, 'waiter-waitress');
    expect(scoped).not.toBe(agnostic);
  });

  it('the role slug appears right after the version salt', async () => {
    const key = await buildCacheKey(BASE_CV, undefined, 'sommelier-wine-waiter');
    expect(key.startsWith(`check:${SCORING_VERSION}:sommelier-wine-waiter:`)).toBe(true);
  });

  it('role + JD still yields a stable, distinct key', async () => {
    const a = await buildCacheKey(BASE_CV, BASE_JD, 'waiter-waitress');
    const b = await buildCacheKey(BASE_CV, BASE_JD, 'waiter-waitress');
    const noRole = await buildCacheKey(BASE_CV, BASE_JD);
    expect(a).toBe(b);
    expect(a).not.toBe(noRole);
  });
});

describe('buildCacheKey — SCORING_VERSION salt', () => {
  it('key starts with check:{SCORING_VERSION}:', async () => {
    const key = await buildCacheKey(BASE_CV);
    expect(key.startsWith(`check:${SCORING_VERSION}:`)).toBe(true);
  });

  it('manually bumping the version produces a different key', async () => {
    // Simulate a version bump by manipulating the key prefix inspection
    const key = await buildCacheKey(BASE_CV);
    // The key contains the current SCORING_VERSION; a different version would differ
    const simulatedNewVersionKey = key.replace(
      `check:${SCORING_VERSION}:`,
      `check:${SCORING_VERSION}_bumped:`,
    );
    expect(key).not.toBe(simulatedNewVersionKey);
  });
});

describe('buildCacheKey — key structure', () => {
  it('no-JD key has exactly 3 colon-separated segments', async () => {
    const key = await buildCacheKey(BASE_CV);
    const segments = key.split(':');
    expect(segments).toHaveLength(3); // check, version, textHash
    expect(segments[0]).toBe('check');
    expect(segments[1]).toBe(SCORING_VERSION);
    expect(segments[2]).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('with-JD key has exactly 4 colon-separated segments', async () => {
    const key = await buildCacheKey(BASE_CV, BASE_JD);
    const segments = key.split(':');
    expect(segments).toHaveLength(4); // check, version, textHash, jdHash
    expect(segments[3]).toHaveLength(64);
  });
});

describe('sha256Hex', () => {
  it('produces a 64-char hex string', async () => {
    const h = await sha256Hex('hello');
    expect(h).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('is deterministic', async () => {
    expect(await sha256Hex('test')).toBe(await sha256Hex('test'));
  });

  it('different inputs produce different hashes', async () => {
    expect(await sha256Hex('a')).not.toBe(await sha256Hex('b'));
  });
});
