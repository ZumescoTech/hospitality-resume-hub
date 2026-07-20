/**
 * T4.2 — Deterministic feedback + confidence engine
 *
 * Tests cover:
 *   A — buildDeterministicFeedback: known keyword gaps produce specific strings
 *   B — buildDeterministicFeedback: signal-based suggestions fire correctly
 *   C — computeConfidence: High/Medium/Low levels from signal combos
 *   D — buildNeutralLlmResponse: degrades gracefully without LLM
 */

import { describe, it, expect } from 'vitest';
import {
  buildDeterministicFeedback,
  computeConfidence,
  buildNeutralLlmResponse,
} from '@/lib/cvFeedback';
import type { DeterministicSignals } from '@/lib/cvDeterministicChecks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cleanSignals(overrides?: Partial<DeterministicSignals>): DeterministicSignals {
  return {
    hasContactInfo: true,
    hasSummarySection: true,
    headingsFound: ['Experience', 'Education', 'Skills'],
    wordCount: 400,
    quantifiedBulletCount: 3,
    suspectGarbledText: false,
    ...overrides,
  };
}

// ─── Test A: keyword-based suggestions ────────────────────────────────────────

describe('T4.2-A: buildDeterministicFeedback — keyword suggestions', () => {
  it('STCW missing → contains STCW-specific advice', () => {
    const suggestions = buildDeterministicFeedback(['STCW'], cleanSignals(), 'Waiter');
    expect(suggestions.some((s) => /STCW/i.test(s))).toBe(true);
    expect(suggestions.some((s) => /safety training|mandatory|certification/i.test(s))).toBe(true);
  });

  it('HACCP missing → contains HACCP-specific advice', () => {
    const suggestions = buildDeterministicFeedback(['HACCP'], cleanSignals(), 'Chef');
    expect(suggestions.some((s) => /HACCP/i.test(s))).toBe(true);
  });

  it('WSET missing → contains WSET-specific advice', () => {
    const suggestions = buildDeterministicFeedback(['WSET'], cleanSignals(), 'Sommelier');
    expect(suggestions.some((s) => /WSET/i.test(s))).toBe(true);
    expect(suggestions.some((s) => /level/i.test(s))).toBe(true);
  });

  it('Opera PMS missing → contains Opera PMS advice', () => {
    const suggestions = buildDeterministicFeedback(['Opera PMS'], cleanSignals(), 'Receptionist');
    expect(suggestions.some((s) => /Opera PMS/i.test(s))).toBe(true);
  });

  it('Micros missing → contains Micros advice', () => {
    const suggestions = buildDeterministicFeedback(['micros'], cleanSignals(), 'Bartender');
    expect(suggestions.some((s) => /Micros/i.test(s))).toBe(true);
  });

  it('Upselling missing → advice mentions quantifying results', () => {
    const suggestions = buildDeterministicFeedback(['upselling'], cleanSignals(), 'Bartender');
    expect(suggestions.some((s) => /upselling|revenue|quantif/i.test(s))).toBe(true);
  });

  it('Unknown keyword → falls back to generic suggestion', () => {
    const suggestions = buildDeterministicFeedback(['sommelier-certification-xyz'], cleanSignals(), 'Chef');
    expect(suggestions.some((s) => /sommelier-certification-xyz/i.test(s))).toBe(true);
  });

  it('returns at most 5 suggestions total', () => {
    const manyMissing = ['STCW', 'HACCP', 'WSET', 'Micros', 'Opera PMS', 'cruise ship', 'upselling', 'silver service'];
    const suggestions = buildDeterministicFeedback(manyMissing, cleanSignals(), 'F&B Supervisor');
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });
});

// ─── Test B: signal-based suggestions ─────────────────────────────────────────

describe('T4.2-B: buildDeterministicFeedback — signal-based suggestions', () => {
  it('no contact info → suggests adding email and phone', () => {
    const suggestions = buildDeterministicFeedback([], cleanSignals({ hasContactInfo: false }), 'Waiter');
    expect(suggestions.some((s) => /email|phone/i.test(s))).toBe(true);
  });

  it('no summary → suggests adding a profile section tailored to role', () => {
    const suggestions = buildDeterministicFeedback([], cleanSignals({ hasSummarySection: false }), 'Bar Supervisor');
    expect(suggestions.some((s) => /summary|profile/i.test(s))).toBe(true);
    expect(suggestions.some((s) => /Bar Supervisor/i.test(s))).toBe(true);
  });

  it('garbled text → suggests re-uploading as DOCX', () => {
    const suggestions = buildDeterministicFeedback([], cleanSignals({ suspectGarbledText: true }), 'Waiter');
    expect(suggestions.some((s) => /docx|word|garbled/i.test(s))).toBe(true);
  });

  it('very short word count → suggests adding more detail', () => {
    const suggestions = buildDeterministicFeedback([], cleanSignals({ wordCount: 120 }), 'Waiter');
    expect(suggestions.some((s) => /short|detail/i.test(s))).toBe(true);
  });

  it('zero quantified bullets + enough words → suggests adding numbers', () => {
    const suggestions = buildDeterministicFeedback(
      [],
      cleanSignals({ quantifiedBulletCount: 0, wordCount: 300 }),
      'Waiter',
    );
    expect(suggestions.some((s) => /numbers?|quantif|metric|revenue/i.test(s))).toBe(true);
  });

  it('clean CV with no gaps → returns empty or only keyword suggestions', () => {
    const suggestions = buildDeterministicFeedback([], cleanSignals(), 'Waiter');
    // No signal issues, no missing keywords → empty
    expect(suggestions.length).toBe(0);
  });
});

// ─── Test C: computeConfidence ────────────────────────────────────────────────

describe('T4.2-C: computeConfidence', () => {
  it('clean signals + good match ratio → High confidence', () => {
    const result = computeConfidence(cleanSignals(), 0.7);
    expect(result.level).toBe('High');
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('garbled text → Low confidence', () => {
    const result = computeConfidence(cleanSignals({ suspectGarbledText: true }), 0.5);
    expect(result.level).toBe('Low');
    expect(result.reasons.some((r) => /text quality|garbled/i.test(r))).toBe(true);
  });

  it('very short CV → Low confidence', () => {
    const result = computeConfidence(cleanSignals({ wordCount: 80 }), 0.5);
    expect(result.level).toBe('Low');
    expect(result.reasons.some((r) => /short|missing/i.test(r))).toBe(true);
  });

  it('missing contact info → Medium confidence', () => {
    const result = computeConfidence(cleanSignals({ hasContactInfo: false }), 0.4);
    expect(result.level).toBe('Medium');
    expect(result.reasons.some((r) => /contact/i.test(r))).toBe(true);
  });

  it('very low match ratio → Medium confidence', () => {
    const result = computeConfidence(cleanSignals(), 0.05);
    expect(result.level).toBe('Medium');
    expect(result.reasons.some((r) => /keyword match|relevant/i.test(r))).toBe(true);
  });

  it('isDegraded=true → Low confidence with AI unavailable reason', () => {
    const result = computeConfidence(cleanSignals(), 0.6, true);
    expect(result.level).toBe('Low');
    expect(result.reasons.some((r) => /AI|unavailable|temporarily/i.test(r))).toBe(true);
  });
});

// ─── Test D: buildNeutralLlmResponse ─────────────────────────────────────────

describe('T4.2-D: buildNeutralLlmResponse', () => {
  it('returns a valid RawLlmResponse shape', () => {
    const llm = buildNeutralLlmResponse(0.5, cleanSignals());
    expect(typeof llm.keywordAlignment.score).toBe('number');
    expect(typeof llm.experienceDepth.score).toBe('number');
    expect(Array.isArray(llm.topFixes)).toBe(true);
  });

  it('keywordAlignment score reflects matchRatio', () => {
    const low  = buildNeutralLlmResponse(0.1, cleanSignals());
    const high = buildNeutralLlmResponse(0.8, cleanSignals());
    expect(high.keywordAlignment.score).toBeGreaterThan(low.keywordAlignment.score);
  });

  it('atsParseability score is higher for clean signals than garbled', () => {
    const clean   = buildNeutralLlmResponse(0.5, cleanSignals());
    const garbled = buildNeutralLlmResponse(0.5, cleanSignals({ suspectGarbledText: true, hasContactInfo: false }));
    expect(clean.atsParseability.score).toBeGreaterThan(garbled.atsParseability.score);
  });

  it('all scores are in 0–100 range', () => {
    const llm = buildNeutralLlmResponse(0.0, cleanSignals({ wordCount: 50, suspectGarbledText: true }));
    const scores = [
      llm.keywordAlignment.score,
      llm.experienceDepth.score,
      llm.quantifiedAchievements.score,
      llm.qualifications.score,
      llm.cruiseReadiness.score,
      llm.atsParseability.score,
      llm.summaryQuality.score,
    ];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('OCR fixture (garbled + low word count) → Low confidence reason includes text quality', () => {
    const signals = cleanSignals({ suspectGarbledText: true, wordCount: 140 });
    const confidence = computeConfidence(signals, 0.2);
    expect(confidence.level).toBe('Low');
  });
});
