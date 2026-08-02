import { describe, it, expect } from 'vitest';
import {
  parseCvCheckResponse,
  computeCvScore,
  toTierFromScore,
  type RawLlmResponse,
} from '@/lib/cruiseCvRubric';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeValidRaw(overrides: Partial<RawLlmResponse> = {}): RawLlmResponse {
  return {
    keywordAlignment:        { score: 70, feedback: 'Good keyword coverage.' },
    experienceDepth:         { score: 72, feedback: 'Relevant cruise experience.' },
    quantifiedAchievements:  { score: 60, feedback: 'Some metrics present.' },
    qualifications:          { score: 70, feedback: 'WSET present.' },
    cruiseReadiness:         { score: 65, feedback: 'ENG1 and C1/D listed.' },
    atsParseability:         { score: 75, feedback: 'Clean structure.' },
    summaryQuality:          { score: 75, feedback: 'Good summary.' },
    topFixes: ['Add STCW certification', 'Quantify beverage revenue impact'],
    ...overrides,
  };
}

// ─── B-0 T1: markdown-fenced JSON must parse correctly ────────────────────────

describe('parseCvCheckResponse', () => {
  it('T1: parses a clean JSON string', () => {
    const raw = JSON.stringify(makeValidRaw());
    const result = parseCvCheckResponse(raw);
    expect(result.keywordAlignment.score).toBe(70);
    expect(result.topFixes).toHaveLength(2);
  });

  it('T1: strips ```json ... ``` markdown fences and parses correctly', () => {
    const raw = '```json\n' + JSON.stringify(makeValidRaw()) + '\n```';
    const result = parseCvCheckResponse(raw);
    expect(result.keywordAlignment.score).toBe(70);
  });

  it('T1: strips ``` ... ``` fences without language tag', () => {
    const raw = '```\n' + JSON.stringify(makeValidRaw()) + '\n```';
    const result = parseCvCheckResponse(raw);
    expect(result.atsParseability.score).toBe(75);
  });

  it('T1: handles prose prefix before JSON object', () => {
    const raw = 'Here is my evaluation:\n' + JSON.stringify(makeValidRaw());
    const result = parseCvCheckResponse(raw);
    expect(result.experienceDepth.score).toBe(72);
  });

  it('T1: handles prose suffix after JSON object', () => {
    const raw = JSON.stringify(makeValidRaw()) + '\n\nLet me know if you need clarification.';
    const result = parseCvCheckResponse(raw);
    expect(result.qualifications.score).toBe(70);
  });

  // ─── B-0 T2: unparseable response → named error, never silent 0 ──────────

  it('T2: throws a ScoreParseError (not a generic error) on completely unparseable input', () => {
    expect(() => parseCvCheckResponse('This is not JSON at all.')).toThrow('ScoreParseError');
  });

  it('T2: throws a ScoreParseError when JSON is valid but missing required categories', () => {
    const incomplete = JSON.stringify({ topFixes: [] }); // no category keys
    expect(() => parseCvCheckResponse(incomplete)).toThrow('ScoreParseError');
  });

  it('T2: throws a ScoreParseError when a category score is not a number', () => {
    const badScore = JSON.stringify({
      ...makeValidRaw(),
      keywordAlignment: { score: 'high', feedback: 'good' },
    });
    expect(() => parseCvCheckResponse(badScore)).toThrow('ScoreParseError');
  });

  it('T2: throws ScoreParseError when new required category cruiseReadiness is missing', () => {
    const raw = makeValidRaw();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (raw as any).cruiseReadiness;
    expect(() => parseCvCheckResponse(JSON.stringify(raw))).toThrow('ScoreParseError');
  });

  it('T2: never returns a result with any category score of exactly 0 from a default/fallback', () => {
    const raw = JSON.stringify(makeValidRaw({ keywordAlignment: { score: 45, feedback: 'Low match.' } }));
    const result = parseCvCheckResponse(raw);
    expect(result.keywordAlignment.score).toBe(45);
  });
});

// ─── B-0 T3: score and band must derive from the same object ─────────────────

describe('computeCvScore', () => {
  it('T3: tier and overallScore are always consistent — score < 50 → Major Gaps', () => {
    const low = makeValidRaw({
      keywordAlignment:       { score: 10, feedback: 'Poor.' },
      experienceDepth:        { score: 10, feedback: 'Minimal.' },
      quantifiedAchievements: { score: 5,  feedback: 'None.' },
      qualifications:         { score: 10, feedback: 'None.' },
      cruiseReadiness:        { score: 5,  feedback: 'None.' },
      atsParseability:        { score: 15, feedback: 'Poor.' },
      summaryQuality:         { score: 15, feedback: 'Poor.' },
    });
    const result = computeCvScore(low, [], []);
    expect(result.overallScore).toBeLessThan(50);
    expect(result.tier).toBe('Major Gaps');
  });

  it('T3: tier and overallScore are always consistent — score 50-69 → Needs Work', () => {
    const mid = makeValidRaw({
      keywordAlignment:       { score: 55, feedback: 'ok' },
      experienceDepth:        { score: 55, feedback: 'ok' },
      quantifiedAchievements: { score: 50, feedback: 'ok' },
      qualifications:         { score: 55, feedback: 'ok' },
      cruiseReadiness:        { score: 50, feedback: 'ok' },
      atsParseability:        { score: 60, feedback: 'ok' },
      summaryQuality:         { score: 60, feedback: 'ok' },
    });
    const result = computeCvScore(mid, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.overallScore).toBeLessThan(70);
    expect(result.tier).toBe('Needs Work');
  });

  it('T3: tier and overallScore are always consistent — score 70-84 → Good', () => {
    const good = makeValidRaw({
      keywordAlignment:       { score: 75, feedback: 'ok' },
      experienceDepth:        { score: 72, feedback: 'ok' },
      quantifiedAchievements: { score: 70, feedback: 'ok' },
      qualifications:         { score: 70, feedback: 'ok' },
      cruiseReadiness:        { score: 70, feedback: 'ok' },
      atsParseability:        { score: 70, feedback: 'ok' },
      summaryQuality:         { score: 72, feedback: 'ok' },
    });
    const result = computeCvScore(good, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.overallScore).toBeLessThan(85);
    expect(result.tier).toBe('Good');
  });

  it('T3: tier and overallScore are always consistent — score >= 85 → Strong', () => {
    const strong = makeValidRaw({
      keywordAlignment:       { score: 90, feedback: 'ok' },
      experienceDepth:        { score: 90, feedback: 'ok' },
      quantifiedAchievements: { score: 85, feedback: 'ok' },
      qualifications:         { score: 85, feedback: 'ok' },
      cruiseReadiness:        { score: 85, feedback: 'ok' },
      atsParseability:        { score: 88, feedback: 'ok' },
      summaryQuality:         { score: 88, feedback: 'ok' },
    });
    const result = computeCvScore(strong, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe('Strong');
  });

  it('T3: overallScore=0 is impossible from defaults — missing categories use ?? 50 not ?? 0', () => {
    const allDefaults = makeValidRaw();
    Object.keys(allDefaults).forEach((k) => {
      if (k !== 'topFixes') {
        (allDefaults as Record<string, unknown>)[k] = undefined;
      }
    });
    const result = computeCvScore(allDefaults, [], []);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.tier).not.toBe('Major Gaps');
  });

  // ─── B-1 T6: headline == weighted sum of seven categories ────────────────

  it('T6: headline score equals weighted sum of the seven B-1 §2 category scores', () => {
    const raw = makeValidRaw({
      keywordAlignment:       { score: 80, feedback: 'ok' },
      experienceDepth:        { score: 75, feedback: 'ok' },
      quantifiedAchievements: { score: 60, feedback: 'ok' },
      qualifications:         { score: 70, feedback: 'ok' },
      cruiseReadiness:        { score: 50, feedback: 'ok' },
      atsParseability:        { score: 65, feedback: 'ok' },
      summaryQuality:         { score: 70, feedback: 'ok' },
    });
    const result = computeCvScore(raw, [], []);
    // v3 default (cert-neutral) weighted sum: 0.30*80 + 0.30*75 + 0.25*60 +
    // 0*70 (qual) + 0*50 (cruiseReadiness) + 0.10*65 + 0.05*70
    // = 24 + 22.5 + 15 + 0 + 0 + 6.5 + 3.5 = 71.5 → 72
    expect(result.overallScore).toBe(72);
  });

  it('T6: default profile zero-weights the cert dimensions; all weights still sum to 1.00', () => {
    const result = computeCvScore(makeValidRaw(), [], []); // no role → default profile
    expect(result.categories.keywordAlignment.weight).toBe(0.30);
    expect(result.categories.experienceDepth.weight).toBe(0.30);
    expect(result.categories.quantifiedAchievements.weight).toBe(0.25);
    expect(result.categories.qualifications.weight).toBe(0);      // cert dim → 0
    expect(result.categories.cruiseReadiness.weight).toBe(0);     // cert dim → 0
    expect(result.categories.atsParseability.weight).toBe(0.10);
    expect(result.categories.summaryQuality.weight).toBe(0.05);
    // Verify the sum of all weights equals 1.00
    const total = Object.values(result.categories).reduce((acc, c) => acc + c.weight, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

// ─── toTierFromScore: exported for direct testing ────────────────────────────

describe('toTierFromScore', () => {
  it('maps 0 → Major Gaps (never Needs Work)', () => {
    expect(toTierFromScore(0)).toBe('Major Gaps');
  });
  it('maps 49 → Major Gaps', () => {
    expect(toTierFromScore(49)).toBe('Major Gaps');
  });
  it('maps 50 → Needs Work', () => {
    expect(toTierFromScore(50)).toBe('Needs Work');
  });
  it('maps 69 → Needs Work', () => {
    expect(toTierFromScore(69)).toBe('Needs Work');
  });
  it('maps 70 → Good', () => {
    expect(toTierFromScore(70)).toBe('Good');
  });
  it('maps 84 → Good', () => {
    expect(toTierFromScore(84)).toBe('Good');
  });
  it('maps 85 → Strong', () => {
    expect(toTierFromScore(85)).toBe('Strong');
  });
  it('maps 100 → Strong', () => {
    expect(toTierFromScore(100)).toBe('Strong');
  });
});
