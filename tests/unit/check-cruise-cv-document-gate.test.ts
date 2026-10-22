/**
 * The document gate runs before the cache and the scorer: non-CVs and
 * unconfirmed uncertain documents never receive (or read back) a score.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { getCachedResult, setCachedResult } = vi.hoisted(() => ({
  getCachedResult: vi.fn(async () => null),
  setCachedResult: vi.fn(async () => undefined),
}));

vi.mock('@/lib/kv-cache', async (orig) => ({
  ...(await orig<typeof import('@/lib/kv-cache')>()),
  getCachedResult,
  setCachedResult,
}));

import { publicCruiseCvCheckData, runCruiseCvCheck } from '@/lib/cruise-cv-check';

const fixture = (p: string) => readFileSync(resolve(__dirname, '../fixtures', p), 'utf8');
const UNCERTAIN =
  'Sam Example\nsam@example.com\nI like working with people and want a job on a ship one day, maybe as crew. ' +
  'I am patient, I enjoy meeting new people from other countries, and I am happy to work long hours ' +
  'when it is busy. I would like to learn more about hospitality.';

const check = (cvText: string, confirmedCv?: boolean) =>
  runCruiseCvCheck(publicCruiseCvCheckData({ cvText, roleSlug: 'waiter-waitress', confirmedCv }));

describe('runCruiseCvCheck — document gate', () => {
  beforeEach(() => {
    getCachedResult.mockClear();
    setCachedResult.mockClear();
  });

  it.each(['invoice.txt', 'cover-letter.txt', 'bank-statement.txt', 'certificate.txt', 'assignment.txt'])(
    '%s returns not_a_cv without touching the score cache',
    async (file) => {
      const outcome = await check(fixture(`documents/non-cv/${file}`));
      expect(outcome.kind).toBe('not_a_cv');
      expect(outcome).not.toHaveProperty('result');
      expect(getCachedResult).not.toHaveBeenCalled();
      expect(setCachedResult).not.toHaveBeenCalled();
    },
  );

  it('candidate confirmation cannot override a not_a_cv verdict', async () => {
    const outcome = await check(fixture('documents/non-cv/invoice.txt'), true);
    expect(outcome.kind).toBe('not_a_cv');
  });

  it('uncertain documents are not scored until confirmed', async () => {
    expect((await check(UNCERTAIN)).kind).toBe('uncertain_document');
    expect(getCachedResult).not.toHaveBeenCalled();
    expect((await check(UNCERTAIN, true)).kind).toBe('scored');
  });

  it('genuine CVs (including sparse beginner CVs) are scored', async () => {
    expect((await check(fixture('cvs/waiter-experienced.txt'))).kind).toBe('scored');
    expect((await check(fixture('documents/cv/beginner-one-page.txt'))).kind).toBe('scored');
  });

  it('public request data only forwards confirmedCv when true', () => {
    expect(publicCruiseCvCheckData({ cvText: 'x', roleSlug: 'r' })).not.toHaveProperty('confirmedCv');
    expect(publicCruiseCvCheckData({ cvText: 'x', roleSlug: 'r', confirmedCv: true }).confirmedCv).toBe(true);
  });
});
