/**
 * Public cruise-cv-checker must score on the free local engine and must not
 * call parseCvForBuilder (Groq extract) on submit.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { publicCruiseCvCheckData } from '@/lib/cruise-cv-check';
import { parseCvLocally } from '@/lib/cvExtractDeterministic';

const checkerSrc = readFileSync(
  resolve(__dirname, '../../src/routes/tools/cruise-cv-checker.tsx'),
  'utf8',
);

const CV = readFileSync(resolve(__dirname, '../fixtures/cvs/waiter-experienced.txt'), 'utf8');

describe('publicCruiseCvCheckData — always free', () => {
  it('sets tier to free', () => {
    const payload = publicCruiseCvCheckData({
      cvText: CV,
      roleSlug: 'waiter-waitress',
    });
    expect(payload.tier).toBe('free');
    expect(payload.roleSlug).toBe('waiter-waitress');
    expect(payload.cvText).toBe(CV);
  });

  it('never returns paid, even when a JD is present', () => {
    const payload = publicCruiseCvCheckData({
      cvText: CV,
      roleSlug: 'sommelier-wine-waiter',
      jobDescription: 'Need a sommelier with WSET 3',
    });
    expect(payload.tier).toBe('free');
    expect(payload.jobDescription).toBe('Need a sommelier with WSET 3');
  });

  it('drops whitespace-only job descriptions', () => {
    const payload = publicCruiseCvCheckData({
      cvText: CV,
      roleSlug: 'waiter-waitress',
      jobDescription: '   ',
    });
    expect(payload.jobDescription).toBeUndefined();
    expect(payload.tier).toBe('free');
  });
});

describe('public checker page wiring', () => {
  it('sends scores through publicCruiseCvCheckData', () => {
    expect(checkerSrc).toContain('publicCruiseCvCheckData');
    expect(checkerSrc).toContain('checkCruiseCv');
  });

  it('does not call parseCvForBuilder (that path constructs Groq)', () => {
    expect(checkerSrc).not.toContain('parseCvForBuilder');
  });

  it('builds the builder handoff with parseCvLocally', () => {
    expect(checkerSrc).toContain('parseCvLocally');
  });
});

describe('parseCvLocally — checker handoff, zero network', () => {
  it('fills name and contact from waiter-experienced', () => {
    const parsed = parseCvLocally(CV);
    expect(parsed.personal.fullName).toBe('JAMES HOLLOWAY');
    expect(parsed.personal.email).toBe('james.holloway@email.com');
    expect(parsed.personal.phone).toMatch(/7700/);
    expect(parsed.personal.links?.some((l) => /linkedin/i.test(l.url))).toBe(true);
  });

  it('returns a builder-safe skeleton (arrays present, vintage template)', () => {
    const parsed = parseCvLocally(CV);
    expect(parsed.templateId).toBe('vintage');
    expect(Array.isArray(parsed.experience)).toBe(true);
    expect(Array.isArray(parsed.education)).toBe(true);
    expect(Array.isArray(parsed.certifications)).toBe(true);
    expect(Array.isArray(parsed.skills)).toBe(true);
  });
});
