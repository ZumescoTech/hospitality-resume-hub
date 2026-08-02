/**
 * Role-conditional rubric weighting (SCORING_VERSION 3).
 *
 * Contract:
 *   - Every role EXCEPT sommelier-wine-waiter uses the cert-neutral default
 *     profile: cruiseReadiness and qualifications carry ZERO weight, so cert
 *     presence (STCW/ENG1/HACCP/WSET) cannot raise or lower the score.
 *   - Sommelier keeps the cert-aware profile: qualifications (and
 *     cruiseReadiness) still count, so WSET/CMS credit flows through.
 */
import { describe, it, expect } from 'vitest';
import {
  computeCvScore,
  weightsForRole,
  CATEGORY_WEIGHTS,
  SOMMELIER_CATEGORY_WEIGHTS,
  type RawLlmResponse,
  type CategoryKey,
} from '@/lib/cruiseCvRubric';
import { SOMMELIER_SLUG } from '@/lib/precheck/certGate';

const SOMM = SOMMELIER_SLUG;
const NON_SOMM = 'cabin-steward-stewardess';

function raw(overrides: Partial<Record<CategoryKey, number>> = {}): RawLlmResponse {
  const base: Record<CategoryKey, number> = {
    keywordAlignment: 60,
    experienceDepth: 60,
    quantifiedAchievements: 60,
    qualifications: 60,
    cruiseReadiness: 60,
    atsParseability: 60,
    summaryQuality: 60,
    ...overrides,
  };
  const feedback = 'x';
  return {
    keywordAlignment:       { score: base.keywordAlignment, feedback },
    experienceDepth:        { score: base.experienceDepth, feedback },
    quantifiedAchievements: { score: base.quantifiedAchievements, feedback },
    qualifications:         { score: base.qualifications, feedback },
    cruiseReadiness:        { score: base.cruiseReadiness, feedback },
    atsParseability:        { score: base.atsParseability, feedback },
    summaryQuality:         { score: base.summaryQuality, feedback },
    topFixes: [],
  } as RawLlmResponse;
}

describe('weightsForRole', () => {
  it('sommelier gets the cert-aware profile (qualifications + cruiseReadiness weighted)', () => {
    const w = weightsForRole(SOMM);
    expect(w).toBe(SOMMELIER_CATEGORY_WEIGHTS);
    expect(w.qualifications).toBe(0.10);
    expect(w.cruiseReadiness).toBe(0.10);
  });

  it('every other role (and an omitted slug) gets the cert-neutral default', () => {
    for (const slug of [NON_SOMM, 'waiter-waitress', 'bartender-bar-waiter', undefined]) {
      const w = weightsForRole(slug);
      expect(w).toBe(CATEGORY_WEIGHTS);
      expect(w.qualifications).toBe(0);
      expect(w.cruiseReadiness).toBe(0);
    }
  });

  it('both profiles sum to exactly 1.00', () => {
    const sum = (w: Record<CategoryKey, number>) => Object.values(w).reduce((a, b) => a + b, 0);
    expect(sum(CATEGORY_WEIGHTS)).toBeCloseTo(1.0, 10);
    expect(sum(SOMMELIER_CATEGORY_WEIGHTS)).toBeCloseTo(1.0, 10);
  });
});

describe('non-sommelier role: certifications get NO rubric credit', () => {
  it('varying cruiseReadiness (STCW/ENG1) from 0→100 does not change the score', () => {
    const noDocs = computeCvScore(raw({ cruiseReadiness: 0 }), [], [], NON_SOMM);
    const allDocs = computeCvScore(raw({ cruiseReadiness: 100 }), [], [], NON_SOMM);
    expect(allDocs.overallScore).toBe(noDocs.overallScore);
  });

  it('varying qualifications (WSET/HACCP) from 0→100 does not change the score', () => {
    const noQual = computeCvScore(raw({ qualifications: 0 }), [], [], NON_SOMM);
    const fullQual = computeCvScore(raw({ qualifications: 100 }), [], [], NON_SOMM);
    expect(fullQual.overallScore).toBe(noQual.overallScore);
  });

  it('a candidate with all cruise certs scores identically to one with none, all else equal', () => {
    const withCerts = computeCvScore(raw({ qualifications: 95, cruiseReadiness: 95 }), [], [], NON_SOMM);
    const withoutCerts = computeCvScore(raw({ qualifications: 5, cruiseReadiness: 5 }), [], [], NON_SOMM);
    expect(withCerts.overallScore).toBe(withoutCerts.overallScore);
    // and the score is driven by the experience/skills signals instead
    expect(withCerts.categories.qualifications.weight).toBe(0);
    expect(withCerts.categories.cruiseReadiness.weight).toBe(0);
  });
});

describe('sommelier role: WSET/CMS (qualifications) still credited', () => {
  it('varying qualifications from 0→100 DOES change the score', () => {
    const noQual = computeCvScore(raw({ qualifications: 0 }), [], [], SOMM);
    const fullQual = computeCvScore(raw({ qualifications: 100 }), [], [], SOMM);
    expect(fullQual.overallScore).toBeGreaterThan(noQual.overallScore);
    // qualifications weight is 0.10 → a 100-point swing moves the total ~10.
    expect(fullQual.overallScore - noQual.overallScore).toBe(10);
  });

  it('cruiseReadiness still counts for sommelier', () => {
    const lo = computeCvScore(raw({ cruiseReadiness: 0 }), [], [], SOMM);
    const hi = computeCvScore(raw({ cruiseReadiness: 100 }), [], [], SOMM);
    expect(hi.overallScore).toBeGreaterThan(lo.overallScore);
  });
});
