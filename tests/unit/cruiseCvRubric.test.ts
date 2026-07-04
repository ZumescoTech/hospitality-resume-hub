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
    atsParseability:         { score: 75, feedback: 'Clean structure.' },
    quantifiedAchievements:  { score: 60, feedback: 'Some metrics present.' },
    experienceDepth:         { score: 65, feedback: 'Relevant experience.' },
    jobTitleAlignment:       { score: 80, feedback: 'Title matches well.' },
    qualifications:          { score: 70, feedback: 'WSET present.' },
    readabilityAndSummary:   { score: 75, feedback: 'Good summary.' },
    topFixes: ['Add seafarer documents', 'Quantify more achievements'],
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
    // LLM sometimes adds "Here is the evaluation:" before the JSON
    const raw = 'Here is my evaluation:\n' + JSON.stringify(makeValidRaw());
    const result = parseCvCheckResponse(raw);
    expect(result.experienceDepth.score).toBe(65);
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

  it('T2: never returns a result with any category score of exactly 0 from a default/fallback', () => {
    // If parsing succeeds, every score must come from the LLM, not a hardcoded 0
    const raw = JSON.stringify(makeValidRaw({ keywordAlignment: { score: 45, feedback: 'Low match.' } }));
    const result = parseCvCheckResponse(raw);
    // score of 45 is the LLM's actual value, not a default — this must pass through
    expect(result.keywordAlignment.score).toBe(45);
  });
});

// ─── B-0 T3: score and band must derive from the same object ─────────────────

describe('computeCvScore', () => {
  it('T3: tier and overallScore are always consistent — score < 50 → Major Gaps', () => {
    const low = makeValidRaw({
      keywordAlignment:       { score: 10, feedback: 'Poor.' },
      atsParseability:        { score: 15, feedback: 'Poor.' },
      quantifiedAchievements: { score: 5,  feedback: 'None.' },
      experienceDepth:        { score: 10, feedback: 'Minimal.' },
      jobTitleAlignment:      { score: 20, feedback: 'Weak.' },
      qualifications:         { score: 10, feedback: 'None.' },
      readabilityAndSummary:  { score: 15, feedback: 'Poor.' },
    });
    const result = computeCvScore(low, [], []);
    expect(result.overallScore).toBeLessThan(50);
    expect(result.tier).toBe('Major Gaps');
  });

  it('T3: tier and overallScore are always consistent — score 50-69 → Needs Work', () => {
    const mid = makeValidRaw({
      keywordAlignment:       { score: 55, feedback: 'ok' },
      atsParseability:        { score: 60, feedback: 'ok' },
      quantifiedAchievements: { score: 50, feedback: 'ok' },
      experienceDepth:        { score: 55, feedback: 'ok' },
      jobTitleAlignment:      { score: 60, feedback: 'ok' },
      qualifications:         { score: 55, feedback: 'ok' },
      readabilityAndSummary:  { score: 60, feedback: 'ok' },
    });
    const result = computeCvScore(mid, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.overallScore).toBeLessThan(70);
    expect(result.tier).toBe('Needs Work');
  });

  it('T3: tier and overallScore are always consistent — score 70-84 → Good', () => {
    const good = makeValidRaw({
      keywordAlignment:       { score: 75, feedback: 'ok' },
      atsParseability:        { score: 70, feedback: 'ok' },
      quantifiedAchievements: { score: 70, feedback: 'ok' },
      experienceDepth:        { score: 72, feedback: 'ok' },
      jobTitleAlignment:      { score: 75, feedback: 'ok' },
      qualifications:         { score: 70, feedback: 'ok' },
      readabilityAndSummary:  { score: 72, feedback: 'ok' },
    });
    const result = computeCvScore(good, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.overallScore).toBeLessThan(85);
    expect(result.tier).toBe('Good');
  });

  it('T3: tier and overallScore are always consistent — score >= 85 → Strong', () => {
    const strong = makeValidRaw({
      keywordAlignment:       { score: 90, feedback: 'ok' },
      atsParseability:        { score: 88, feedback: 'ok' },
      quantifiedAchievements: { score: 85, feedback: 'ok' },
      experienceDepth:        { score: 90, feedback: 'ok' },
      jobTitleAlignment:      { score: 88, feedback: 'ok' },
      qualifications:         { score: 85, feedback: 'ok' },
      readabilityAndSummary:  { score: 88, feedback: 'ok' },
    });
    const result = computeCvScore(strong, [], []);
    expect(result.overallScore).toBeGreaterThanOrEqual(85);
    expect(result.tier).toBe('Strong');
  });

  it('T3: overallScore=0 is impossible from defaults — missing categories use ?? 50 not ?? 0', () => {
    // Even if all categories default, the score should be ~50, never 0
    const allDefaults = makeValidRaw();
    Object.keys(allDefaults).forEach((k) => {
      if (k !== 'topFixes') {
        (allDefaults as Record<string, unknown>)[k] = undefined;
      }
    });
    // computeCvScore with undefined categories should not produce 0
    const result = computeCvScore(allDefaults, [], []);
    // With ?? 50 defaults, weighted average of 50 across all weights = 50
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.tier).not.toBe('Major Gaps'); // 50 → Needs Work, not Major Gaps
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
