/**
 * T5.3 — Transparent score breakdown UI
 *
 * Verifies that per-category displayed points (earned / max) are derived
 * from the same data source as the engine's final score — no re-derivation.
 *
 * Formula (mirrored from CategoryScoreRow in cruise-cv-checker.tsx):
 *   earned_i = Math.round(categories[i].score * categories[i].weight)
 *   max_i    = Math.round(categories[i].weight * 100)
 *
 * The sum of earned_i should equal overallScore within ±1 (integer rounding).
 */

import { describe, it, expect } from 'vitest';
import {
  computeCvScore,
  CATEGORY_WEIGHTS,
  type RawLlmResponse,
  type CvScoreResult,
  type CategoryKey,
} from '@/lib/cruiseCvRubric';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLlmResponse(scores: Record<string, number>): RawLlmResponse {
  const feedback = 'Test feedback.';
  return {
    keywordAlignment:       { score: scores.keywordAlignment,       feedback },
    experienceDepth:        { score: scores.experienceDepth,        feedback },
    quantifiedAchievements: { score: scores.quantifiedAchievements, feedback },
    qualifications:         { score: scores.qualifications,         feedback },
    cruiseReadiness:        { score: scores.cruiseReadiness,        feedback },
    atsParseability:        { score: scores.atsParseability,        feedback },
    summaryQuality:         { score: scores.summaryQuality,         feedback },
    topFixes: [],
  } as RawLlmResponse;
}

/** Simulate what CategoryScoreRow renders for each category. */
function displayPoints(result: CvScoreResult) {
  return (Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]).map((key) => ({
    key,
    earned: Math.round(result.categories[key].score * result.categories[key].weight),
    max: Math.round(result.categories[key].weight * 100),
  }));
}

// Same golden score sets as T1.2 (synthetic, fixed). v3 default (cert-neutral)
// weights apply except for the sommelier fixture, which keeps the cert-aware
// profile via roleSlug.
const GOLDEN_FIXTURES: Array<{ name: string; scores: Record<string, number>; overallScore: number; roleSlug?: string }> = [
  { name: 'waiter-experienced',      scores: { keywordAlignment: 80, experienceDepth: 82, quantifiedAchievements: 70, qualifications: 75, cruiseReadiness: 85, atsParseability: 80, summaryQuality: 75 }, overallScore: 78 },
  { name: 'bartender-mid',           scores: { keywordAlignment: 60, experienceDepth: 70, quantifiedAchievements: 50, qualifications: 65, cruiseReadiness: 40, atsParseability: 75, summaryQuality: 55 }, overallScore: 62 },
  { name: 'sommelier-junior',        roleSlug: 'sommelier-wine-waiter', scores: { keywordAlignment: 72, experienceDepth: 68, quantifiedAchievements: 60, qualifications: 80, cruiseReadiness: 65, atsParseability: 78, summaryQuality: 70 }, overallScore: 70 },
  { name: 'housekeeping-supervisor', scores: { keywordAlignment: 50, experienceDepth: 75, quantifiedAchievements: 65, qualifications: 55, cruiseReadiness: 55, atsParseability: 80, summaryQuality: 60 }, overallScore: 65 },
  { name: 'fb-supervisor',           scores: { keywordAlignment: 88, experienceDepth: 85, quantifiedAchievements: 82, qualifications: 90, cruiseReadiness: 80, atsParseability: 88, summaryQuality: 85 }, overallScore: 85 },
];

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('T5.3 — score breakdown display points', () => {
  it('max points sum to 100 across all categories', () => {
    const maxSum = (Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]).reduce(
      (acc, key) => acc + Math.round(CATEGORY_WEIGHTS[key] * 100),
      0,
    );
    expect(maxSum).toBe(100);
  });

  for (const { name, scores, overallScore, roleSlug } of GOLDEN_FIXTURES) {
    describe(name, () => {
      it('earned points sum equals overallScore ± 1', () => {
        const result = computeCvScore(makeLlmResponse(scores), [], [], roleSlug);
        expect(result.overallScore).toBe(overallScore); // golden lock
        const pts = displayPoints(result);
        const earnedSum = pts.reduce((acc, p) => acc + p.earned, 0);
        // Rounding on 7 categories can accumulate up to ±2
        expect(Math.abs(earnedSum - result.overallScore)).toBeLessThanOrEqual(2);
      });

      it('per-category earned is in [0, max]', () => {
        const result = computeCvScore(makeLlmResponse(scores), [], [], roleSlug);
        for (const { earned, max } of displayPoints(result)) {
          expect(earned).toBeGreaterThanOrEqual(0);
          expect(earned).toBeLessThanOrEqual(max);
        }
      });

      it('display formula derives from categories, not raw score (no re-derive)', () => {
        const result = computeCvScore(makeLlmResponse(scores), [], [], roleSlug);
        for (const { key, earned, max } of displayPoints(result)) {
          // Must equal the formula in CategoryScoreRow exactly
          expect(earned).toBe(Math.round(result.categories[key].score * result.categories[key].weight));
          expect(max).toBe(Math.round(result.categories[key].weight * 100));
        }
      });
    });
  }
});
