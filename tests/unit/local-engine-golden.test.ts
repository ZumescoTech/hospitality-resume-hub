/**
 * Pins scoreLocally against the same fixture CVs used by T1.2.
 * T1.2 (golden-score.test.ts) stays as the computeCvScore + synthetic-LLM contract.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreLocally } from '@/lib/localEngine';
import type { CvScoreResult } from '@/lib/cruiseCvRubric';

const FIXTURES_DIR = resolve(__dirname, '../fixtures/cvs');

function load(file: string): string {
  return readFileSync(resolve(FIXTURES_DIR, file), 'utf8');
}

interface LocalGolden {
  file: string;
  roleSlug: string;
  expectedOverall: number;
  expectedTier: CvScoreResult['tier'];
}

const GOLDEN: LocalGolden[] = [
  {
    file: 'weak-generic.txt',
    roleSlug: 'waiter-waitress',
    expectedOverall: 16,
    expectedTier: 'Major Gaps',
  },
];

describe('localEngine golden — exact pins', () => {
  for (const g of GOLDEN) {
    it(`${g.file} @ ${g.roleSlug} → ${g.expectedOverall} (${g.expectedTier})`, () => {
      const result = scoreLocally({ cvText: load(g.file), roleSlug: g.roleSlug });
      expect(result.overallScore).toBe(g.expectedOverall);
      expect(result.tier).toBe(g.expectedTier);
    });
  }
});

describe('localEngine golden — ranking + stability (no-term-bank roles)', () => {
  it('waiter-experienced beats weak-generic on waiter-waitress', () => {
    const strong = scoreLocally({ cvText: load('waiter-experienced.txt'), roleSlug: 'waiter-waitress' });
    const weak = scoreLocally({ cvText: load('weak-generic.txt'), roleSlug: 'waiter-waitress' });
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
    expect(strong.overallScore).toBeGreaterThanOrEqual(50);
  });

  it('night-steward (no term bank) still returns a numeric score', () => {
    const result = scoreLocally({
      cvText: load('waiter-experienced.txt'),
      roleSlug: 'night-steward',
    });
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.precheck).toBeUndefined();
  });

  it('same fixture scored 3× is identical', () => {
    const input = { cvText: load('waiter-experienced.txt'), roleSlug: 'waiter-waitress' as const };
    const a = scoreLocally(input);
    const b = scoreLocally(input);
    const c = scoreLocally(input);
    expect(a.overallScore).toBe(b.overallScore);
    expect(b.overallScore).toBe(c.overallScore);
    expect(a.tier).toBe(c.tier);
  });

  it('sommelier junior credits WSET under qualifications (weight 0.10)', () => {
    const result = scoreLocally({
      cvText: load('sommelier-junior.txt'),
      roleSlug: 'sommelier-wine-waiter',
    });
    expect(result.categories.qualifications.weight).toBe(0.1);
    expect(result.categories.qualifications.score).toBeGreaterThanOrEqual(80);
    expect(result.categories.cruiseReadiness.weight).toBe(0.1);
  });

  it('non-sommelier zero-weights cert dimensions', () => {
    const result = scoreLocally({
      cvText: load('waiter-experienced.txt'),
      roleSlug: 'waiter-waitress',
    });
    expect(result.categories.qualifications.weight).toBe(0);
    expect(result.categories.cruiseReadiness.weight).toBe(0);
  });
});
