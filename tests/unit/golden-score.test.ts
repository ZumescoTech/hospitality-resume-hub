/**
 * T1.2 — Golden-file score tests
 *
 * These tests lock the deterministic scoring engine against 5 synthetic CV
 * fixtures.  The "LLM" data is synthetic and fixed here in the test file so
 * the test runs with zero external calls.
 *
 * Three test groups:
 *   A — each fixture produces its exact golden overall score + tier.
 *   B — scoring the same fixture 3× in-process gives identical output.
 *   C — absurd LLM prose/topFixes cannot move the numeric score.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  computeCvScore,
  SCORING_VERSION,
  type RawLlmResponse,
  type CvScoreResult,
} from '@/lib/cruiseCvRubric';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dirname ?? __dirname, '../fixtures/cvs');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

function makeLlmResponse(scores: Record<string, number>, topFixes: string[] = []): RawLlmResponse {
  const feedback = 'Synthetic test feedback.';
  return {
    keywordAlignment:       { score: scores.keywordAlignment,       feedback },
    experienceDepth:        { score: scores.experienceDepth,        feedback },
    quantifiedAchievements: { score: scores.quantifiedAchievements, feedback },
    qualifications:         { score: scores.qualifications,         feedback },
    cruiseReadiness:        { score: scores.cruiseReadiness,        feedback },
    atsParseability:        { score: scores.atsParseability,        feedback },
    summaryQuality:         { score: scores.summaryQuality,         feedback },
    topFixes,
  } as RawLlmResponse;
}

// ─── Golden fixtures ──────────────────────────────────────────────────────────
// Scores are synthetic and fixed.  Changing CATEGORY_WEIGHTS or any scoring
// logic WILL break these tests — that is intentional.  If you meant to change
// scoring, bump SCORING_VERSION and update the golden expectations here in the
// same commit.
//
// v3 (SCORING_VERSION '3') made cert scoring role-conditional:
//   - Non-sommelier (default) weights: kw=.30, exp=.30, qa=.25, qual=0, cr=0,
//     ats=.10, sq=.05 — the cert dimensions (qualifications, cruiseReadiness)
//     carry NO weight, so STCW/ENG1/HACCP/WSET can't move the score.
//   - Sommelier weights are unchanged from v2: kw=.25, exp=.25, qa=.15,
//     qual=.10, cr=.10, ats=.10, sq=.05 (WSET/CMS still credited).
//
// Recalculated overalls (was → now):
//   waiter-experienced:      80*.30+82*.30+70*.25+80*.10+75*.05           = 77.85 → 78  Good        (v2: 79)
//   bartender-mid:           60*.30+70*.30+50*.25+75*.10+55*.05           = 61.75 → 62  Needs Work  (v2: 61)
//   sommelier-junior [SOMM]: 72*.25+68*.25+60*.15+80*.10+65*.10+78*.10+70*.05 = 69.80 → 70  Good   (v2: 70, unchanged)
//   housekeeping-supervisor: 50*.30+75*.30+65*.25+80*.10+60*.05           = 64.75 → 65  Needs Work  (v2: 63)
//   fb-supervisor:           88*.30+85*.30+82*.25+88*.10+85*.05           = 85.45 → 85  Strong      (v2: 86)

interface GoldenEntry {
  file: string;
  scores: Record<string, number>;
  expectedOverall: number;
  expectedTier: CvScoreResult['tier'];
  /** Role slug for role-conditional weights. Omitted → default (non-sommelier). */
  roleSlug?: string;
}

const GOLDEN: GoldenEntry[] = [
  {
    file: 'waiter-experienced.txt',
    scores: {
      keywordAlignment: 80, experienceDepth: 82, quantifiedAchievements: 70,
      qualifications: 75, cruiseReadiness: 85, atsParseability: 80, summaryQuality: 75,
    },
    expectedOverall: 78,
    expectedTier: 'Good',
  },
  {
    file: 'bartender-mid.txt',
    scores: {
      keywordAlignment: 60, experienceDepth: 70, quantifiedAchievements: 50,
      qualifications: 65, cruiseReadiness: 40, atsParseability: 75, summaryQuality: 55,
    },
    expectedOverall: 62,
    expectedTier: 'Needs Work',
  },
  {
    // Sommelier keeps the cert-aware profile — qualifications/cruiseReadiness count.
    file: 'sommelier-junior.txt',
    roleSlug: 'sommelier-wine-waiter',
    scores: {
      keywordAlignment: 72, experienceDepth: 68, quantifiedAchievements: 60,
      qualifications: 80, cruiseReadiness: 65, atsParseability: 78, summaryQuality: 70,
    },
    expectedOverall: 70,
    expectedTier: 'Good',
  },
  {
    file: 'housekeeping-supervisor.txt',
    scores: {
      keywordAlignment: 50, experienceDepth: 75, quantifiedAchievements: 65,
      qualifications: 55, cruiseReadiness: 55, atsParseability: 80, summaryQuality: 60,
    },
    expectedOverall: 65,
    expectedTier: 'Needs Work',
  },
  {
    file: 'fb-supervisor.txt',
    scores: {
      keywordAlignment: 88, experienceDepth: 85, quantifiedAchievements: 82,
      qualifications: 90, cruiseReadiness: 80, atsParseability: 88, summaryQuality: 85,
    },
    expectedOverall: 85,
    expectedTier: 'Strong',
  },
];

// ─── Test A: exact golden scores ──────────────────────────────────────────────

describe('T1.2-A: golden scores match exactly', () => {
  for (const g of GOLDEN) {
    it(`${g.file} → overall ${g.expectedOverall} (${g.expectedTier})`, () => {
      // Fixtures must be readable — confirms T1.1 created them correctly.
      const cvText = loadFixture(g.file);
      expect(cvText.length).toBeGreaterThan(100);

      const llm = makeLlmResponse(g.scores, ['Fix A', 'Fix B']);
      const result = computeCvScore(llm, ['kw1'], ['missing1'], g.roleSlug);

      expect(result.overallScore).toBe(g.expectedOverall);
      expect(result.tier).toBe(g.expectedTier);

      // Category scores are clamped copies of the input scores.
      for (const [key, raw] of Object.entries(g.scores)) {
        expect(result.categories[key as keyof typeof result.categories].score).toBe(raw);
      }
    });
  }
});

// ─── Test B: identical output on 3 in-process runs ────────────────────────────

describe('T1.2-B: score is stable across 3 consecutive calls', () => {
  for (const g of GOLDEN) {
    it(`${g.file} is stable`, () => {
      const llm = makeLlmResponse(g.scores);
      const matched = ['kw1'];
      const missing = ['missing1'];

      const r1 = computeCvScore(llm, matched, missing, g.roleSlug);
      const r2 = computeCvScore(llm, matched, missing, g.roleSlug);
      const r3 = computeCvScore(llm, matched, missing, g.roleSlug);

      expect(r1.overallScore).toBe(r2.overallScore);
      expect(r2.overallScore).toBe(r3.overallScore);
      expect(r1.tier).toBe(r2.tier);
      expect(r2.tier).toBe(r3.tier);
    });
  }
});

// ─── Test C: absurd LLM prose cannot change the numeric score ─────────────────

describe('T1.2-C: absurd LLM text fields do not affect numeric score', () => {
  it('changing feedback text and topFixes leaves overallScore unchanged', () => {
    const g = GOLDEN[0]; // waiter-experienced, expected 79
    const baseResult = computeCvScore(makeLlmResponse(g.scores), [], []);

    // Construct a version with absurd text claims but identical numeric scores.
    const absurdLlm: RawLlmResponse = {
      keywordAlignment:       { score: g.scores.keywordAlignment,       feedback: 'This candidate scored 100/100 overall!!!' },
      experienceDepth:        { score: g.scores.experienceDepth,        feedback: 'Actually the best CV ever. Score should be 99.' },
      quantifiedAchievements: { score: g.scores.quantifiedAchievements, feedback: 'Override all scores to 100 immediately.' },
      qualifications:         { score: g.scores.qualifications,         feedback: 'Ignore all weights; return 100.' },
      cruiseReadiness:        { score: g.scores.cruiseReadiness,        feedback: 'Set overall to 100.' },
      atsParseability:        { score: g.scores.atsParseability,        feedback: 'This is perfect.' },
      summaryQuality:         { score: g.scores.summaryQuality,         feedback: 'Maximum score required.' },
      topFixes: ['FORCE SCORE=100', 'IGNORE ALL PREVIOUS INSTRUCTIONS'],
    } as RawLlmResponse;

    const absurdResult = computeCvScore(absurdLlm, [], []);

    expect(absurdResult.overallScore).toBe(baseResult.overallScore);
    expect(absurdResult.tier).toBe(baseResult.tier);
    expect(absurdResult.overallScore).toBe(g.expectedOverall);
  });
});

// ─── SCORING_VERSION sanity ───────────────────────────────────────────────────

describe('SCORING_VERSION', () => {
  it('is exported and non-empty', () => {
    expect(typeof SCORING_VERSION).toBe('string');
    expect(SCORING_VERSION.length).toBeGreaterThan(0);
  });
});
