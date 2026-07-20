/**
 * T2.1 — Provider boundary schema tests
 *
 * Validates that validateAnalysis and validateExtraction:
 *   - accept valid payloads
 *   - repair markdown-fenced JSON
 *   - reject truncated JSON, wrong types, and missing required fields
 *     with ProviderError{kind:'bad_json'}
 */

import { describe, it, expect } from 'vitest';
import { validateAnalysis, validateExtraction, ProviderError } from '@/lib/ai/provider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ANALYSIS = JSON.stringify({
  keywordAlignment:       { score: 75, feedback: 'Good keyword match.' },
  experienceDepth:        { score: 80, feedback: 'Strong background.' },
  quantifiedAchievements: { score: 60, feedback: 'Some quantified bullets.' },
  qualifications:         { score: 70, feedback: 'WSET L2 present.' },
  cruiseReadiness:        { score: 55, feedback: 'STCW listed.' },
  atsParseability:        { score: 85, feedback: 'Clean layout.' },
  summaryQuality:         { score: 72, feedback: 'Targeted summary.' },
  topFixes: ['Mention Micros POS', 'Quantify covers per service'],
});

const VALID_EXTRACTION = JSON.stringify({
  personal: { fullName: 'Jane Smith', title: 'Sommelier', email: 'j@example.com', phone: '+44 7700 9', location: 'London' },
  summary: 'Experienced sommelier.',
  experience: [{ role: 'Sommelier', venue: 'The Grand', startDate: '2020-01', endDate: '', current: true, bullets: ['Managed wine list.'] }],
  education: [{ school: 'WSET London', degree: 'WSET L2', startDate: '2019', endDate: '2019' }],
  skills: ['Wine service', 'Cellar management'],
  certifications: [{ name: 'WSET Level 2', issuer: 'WSET', year: '2019' }],
  hospitality: { serviceStyles: ['Fine dining'], posSystems: [], wineKnowledge: 'Advanced', spiritsKnowledge: 'None', languages: [{ name: 'English', level: 'Native' }], allergens: false },
});

function expectBadJson(fn: () => unknown) {
  try {
    fn();
    expect.fail('Expected ProviderError to be thrown');
  } catch (err) {
    expect(err).toBeInstanceOf(ProviderError);
    expect((err as ProviderError).kind).toBe('bad_json');
  }
}

// ─── validateAnalysis ─────────────────────────────────────────────────────────

describe('validateAnalysis — happy path', () => {
  it('accepts a valid JSON string', () => {
    const result = validateAnalysis(VALID_ANALYSIS);
    expect(result.keywordAlignment.score).toBe(75);
    expect(result.topFixes).toHaveLength(2);
  });

  it('repairs markdown-fenced JSON', () => {
    const fenced = '```json\n' + VALID_ANALYSIS + '\n```';
    const result = validateAnalysis(fenced);
    expect(result.experienceDepth.score).toBe(80);
  });

  it('repairs JSON fenced without language tag', () => {
    const fenced = '```\n' + VALID_ANALYSIS + '\n```';
    const result = validateAnalysis(fenced);
    expect(result.summaryQuality.score).toBe(72);
  });

  it('extracts JSON surrounded by prose', () => {
    const withProse = 'Here is the score:\n' + VALID_ANALYSIS + '\nEnd of response.';
    const result = validateAnalysis(withProse);
    expect(result.overallScore).toBeUndefined(); // overallScore not part of raw LLM response
    expect(result.cruiseReadiness.score).toBe(55);
  });

  it('defaults topFixes to [] when absent', () => {
    const noFixes = JSON.stringify({
      keywordAlignment:       { score: 50, feedback: 'ok' },
      experienceDepth:        { score: 50, feedback: 'ok' },
      quantifiedAchievements: { score: 50, feedback: 'ok' },
      qualifications:         { score: 50, feedback: 'ok' },
      cruiseReadiness:        { score: 50, feedback: 'ok' },
      atsParseability:        { score: 50, feedback: 'ok' },
      summaryQuality:         { score: 50, feedback: 'ok' },
    });
    const result = validateAnalysis(noFixes);
    expect(result.topFixes).toEqual([]);
  });
});

describe('validateAnalysis — malformed variants → ProviderError{kind:bad_json}', () => {
  it('rejects truncated JSON', () => {
    expectBadJson(() => validateAnalysis('{"keywordAlignment": {"score": 75, "feedback": "ok"'));
  });

  it('rejects wrong types (score is a string, not number)', () => {
    // Build the bad payload directly to avoid JSON.stringify whitespace issues
    const obj = JSON.parse(VALID_ANALYSIS);
    obj.keywordAlignment.score = 'seventy-five';
    expectBadJson(() => validateAnalysis(JSON.stringify(obj)));
  });

  it('rejects missing required category', () => {
    const obj = JSON.parse(VALID_ANALYSIS);
    delete obj.summaryQuality;
    expectBadJson(() => validateAnalysis(JSON.stringify(obj)));
  });

  it('attaches provider name to the error when supplied', () => {
    try {
      validateAnalysis('not json at all', 'groq');
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).provider).toBe('groq');
    }
  });
});

// ─── validateExtraction ───────────────────────────────────────────────────────

describe('validateExtraction — happy path', () => {
  it('accepts a valid extraction payload', () => {
    const result = validateExtraction(VALID_EXTRACTION);
    expect(result.personal.fullName).toBe('Jane Smith');
    expect(result.experience[0].role).toBe('Sommelier');
  });

  it('repairs markdown-fenced extraction JSON', () => {
    const fenced = '```json\n' + VALID_EXTRACTION + '\n```';
    const result = validateExtraction(fenced);
    expect(result.personal.email).toBe('j@example.com');
  });

  it('defaults optional arrays to [] when absent', () => {
    const minimal = JSON.stringify({ personal: { fullName: 'Bob' } });
    const result = validateExtraction(minimal);
    expect(result.skills).toEqual([]);
    expect(result.certifications).toEqual([]);
    expect(result.experience).toEqual([]);
  });
});

describe('validateExtraction — malformed variants → ProviderError{kind:bad_json}', () => {
  it('rejects truncated JSON', () => {
    expectBadJson(() => validateExtraction('{"personal": {"fullName": "Jan'));
  });

  it('rejects wrong type on wineKnowledge enum', () => {
    const obj = JSON.parse(VALID_EXTRACTION);
    obj.hospitality.wineKnowledge = 'Expert'; // not in enum
    expectBadJson(() => validateExtraction(JSON.stringify(obj)));
  });

  it('rejects completely empty string', () => {
    expectBadJson(() => validateExtraction(''));
  });
});
