/**
 * T3.2 — Merged single-call mode (gated)
 *
 * Tests cover:
 *   A — buildMergedPrompts embeds both system prompts and CV text
 *   B — validateMergedResponse parses a well-formed merged JSON string
 *   C — validateMergedResponse throws ProviderError{bad_json} on malformed input
 *   D — validateMergedResponse assigns uid() IDs to array items
 *   E — gate: callRaw is invoked (not analyze) when runMergedCall is used
 *
 * No live API calls. Fixtures are the 5 new CV files added for T3.2.
 */

import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  buildMergedPrompts,
  validateMergedResponse,
  runMergedCall,
} from '@/lib/ai/merged-call';
import { ProviderError, type AiProvider } from '@/lib/ai/provider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FIXTURES_DIR = join(import.meta.dirname ?? __dirname, '../fixtures/cvs');

function loadFixture(filename: string): string {
  return readFileSync(join(FIXTURES_DIR, filename), 'utf-8');
}

function makeMinimalMergedJson(): string {
  return JSON.stringify({
    analysis: {
      keywordAlignment:       { score: 75, feedback: 'Good keyword coverage.' },
      experienceDepth:        { score: 80, feedback: 'Strong experience.' },
      quantifiedAchievements: { score: 60, feedback: 'Some metrics present.' },
      qualifications:         { score: 70, feedback: 'Relevant qualifications.' },
      cruiseReadiness:        { score: 85, feedback: 'STCW present.' },
      atsParseability:        { score: 78, feedback: 'Clean formatting.' },
      summaryQuality:         { score: 72, feedback: 'Focused summary.' },
      topFixes: ['Add Micros POS', 'Quantify guest volumes'],
    },
    resumeData: {
      personal: { fullName: 'Test Person', email: 'test@example.com', phone: '+1 555 000', title: 'Bartender' },
      summary: 'Test summary.',
      experience: [
        { role: 'Bartender', venue: 'Test Hotel', location: 'London', startDate: '2020', endDate: '2023',
          current: false, description: '', bullets: ['Mixed cocktails'] },
      ],
      education: [
        { school: 'Test School', degree: 'Diploma', field: 'Hospitality', startDate: '2018', endDate: '2020', bullets: [] },
      ],
      skills: ['Cocktails', 'WSET'],
      certifications: [
        { name: 'STCW', issuer: 'Maritime Authority', year: '2022' },
      ],
      hospitality: {
        serviceStyles: ['Fine Dining'],
        posSystems: ['Micros'],
        wineKnowledge: 'Beginner',
        spiritsKnowledge: 'Intermediate',
        languages: [{ name: 'English', level: 'Fluent' }],
        allergens: false,
      },
      templateId: 'vintage',
    },
  });
}

// ─── Test A: buildMergedPrompts ────────────────────────────────────────────────

describe('T3.2-A: buildMergedPrompts', () => {
  it('includes both system prompts and CV text in output', () => {
    const cvText = loadFixture('bar-supervisor.txt');
    const { system, user } = buildMergedPrompts(
      'ANALYZE_SYSTEM',
      'ANALYZE_USER',
      cvText,
    );

    expect(system).toContain('ANALYZE_SYSTEM');
    expect(system).toContain('resumeData');
    expect(user).toContain('ANALYZE_USER');
    expect(user).toContain('ROBERTO DELGADO'); // from bar-supervisor.txt
  });

  it('truncates CV text to 6000 chars', () => {
    const longCv = 'x'.repeat(10000);
    const { user } = buildMergedPrompts('sys', 'user', longCv);
    // slice(0, 6000) of 10000 x's → exactly 6000 x's in the CV section
    const xCount = (user.match(/x/g) ?? []).length;
    expect(xCount).toBeLessThanOrEqual(6000);
  });

  it('new gate fixtures are all readable', () => {
    const fixtures = [
      'chef-de-partie.txt',
      'reception-officer.txt',
      'bar-supervisor.txt',
      'wine-waiter-entry.txt',
      'spa-therapist.txt',
    ];
    for (const f of fixtures) {
      const text = loadFixture(f);
      expect(text.length, `${f} should have content`).toBeGreaterThan(100);
    }
  });
});

// ─── Test B: validateMergedResponse — happy path ───────────────────────────────

describe('T3.2-B: validateMergedResponse parses valid merged JSON', () => {
  it('returns analysis and resumeData with correct shapes', () => {
    const raw = makeMinimalMergedJson();
    const result = validateMergedResponse(raw);

    expect(result.analysis.keywordAlignment.score).toBe(75);
    expect(result.analysis.topFixes).toEqual(['Add Micros POS', 'Quantify guest volumes']);
    expect(result.resumeData.personal.fullName).toBe('Test Person');
    expect(result.resumeData.experience[0].role).toBe('Bartender');
    expect(result.resumeData.certifications[0].name).toBe('STCW');
  });

  it('strips markdown fences before parsing', () => {
    const raw = '```json\n' + makeMinimalMergedJson() + '\n```';
    const result = validateMergedResponse(raw);
    expect(result.analysis.keywordAlignment.score).toBe(75);
  });

  it('handles leading/trailing whitespace around JSON', () => {
    const raw = '  \n' + makeMinimalMergedJson() + '  \n';
    const result = validateMergedResponse(raw);
    expect(result.resumeData.personal.fullName).toBe('Test Person');
  });
});

// ─── Test C: validateMergedResponse — malformed input ─────────────────────────

describe('T3.2-C: validateMergedResponse throws ProviderError on bad input', () => {
  it('throws ProviderError{bad_json} when no JSON object present', () => {
    try {
      validateMergedResponse('not json at all');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderError);
      expect((e as ProviderError).kind).toBe('bad_json');
    }
  });

  it('throws ProviderError{bad_json} when analysis section is missing', () => {
    const raw = JSON.stringify({ resumeData: { personal: { fullName: 'X' } } });
    try {
      validateMergedResponse(raw);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderError);
      expect((e as ProviderError).kind).toBe('bad_json');
    }
  });

  it('throws ProviderError{bad_json} when resumeData section is missing', () => {
    const raw = JSON.stringify({
      analysis: {
        keywordAlignment:       { score: 75, feedback: '' },
        experienceDepth:        { score: 75, feedback: '' },
        quantifiedAchievements: { score: 75, feedback: '' },
        qualifications:         { score: 75, feedback: '' },
        cruiseReadiness:        { score: 75, feedback: '' },
        atsParseability:        { score: 75, feedback: '' },
        summaryQuality:         { score: 75, feedback: '' },
        topFixes: [],
      },
    });
    try {
      validateMergedResponse(raw);
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ProviderError);
      expect((e as ProviderError).kind).toBe('bad_json');
    }
  });

  it('attaches provider name to error when supplied', () => {
    try {
      validateMergedResponse('{}', 'groq');
      expect.fail('should have thrown');
    } catch (e) {
      expect((e as ProviderError).provider).toBe('groq');
    }
  });
});

// ─── Test D: validateMergedResponse — IDs are assigned ────────────────────────

describe('T3.2-D: validateMergedResponse assigns unique IDs to array items', () => {
  it('each experience item has a non-empty id', () => {
    const result = validateMergedResponse(makeMinimalMergedJson());
    expect(result.resumeData.experience[0].id).toBeTruthy();
    expect(typeof result.resumeData.experience[0].id).toBe('string');
  });

  it('each certification item has a non-empty id', () => {
    const result = validateMergedResponse(makeMinimalMergedJson());
    expect(result.resumeData.certifications[0].id).toBeTruthy();
  });

  it('two parses of the same JSON produce different IDs (uid is random)', () => {
    const r1 = validateMergedResponse(makeMinimalMergedJson());
    const r2 = validateMergedResponse(makeMinimalMergedJson());
    expect(r1.resumeData.experience[0].id).not.toBe(r2.resumeData.experience[0].id);
  });
});

// ─── Test E: runMergedCall uses callRaw not analyze ────────────────────────────

describe('T3.2-E: runMergedCall delegates to provider.callRaw', () => {
  it('calls callRaw and not analyze', async () => {
    const rawResponse = makeMinimalMergedJson();

    const mockProvider: AiProvider = {
      name: 'mock',
      analyze: vi.fn().mockRejectedValue(new Error('analyze should not be called')),
      extract: vi.fn().mockRejectedValue(new Error('extract should not be called')),
      callRaw: vi.fn().mockResolvedValue(rawResponse),
    };

    const result = await runMergedCall(mockProvider, 'sys', 'user prompt', 'CV text here');

    expect(mockProvider.callRaw).toHaveBeenCalledTimes(1);
    expect(mockProvider.analyze).not.toHaveBeenCalled();
    expect(result.analysis.keywordAlignment.score).toBe(75);
    expect(result.resumeData.personal.fullName).toBe('Test Person');
  });

  it('propagates ProviderError from callRaw', async () => {
    const mockProvider: AiProvider = {
      name: 'mock',
      analyze: vi.fn(),
      extract: vi.fn(),
      callRaw: vi.fn().mockRejectedValue(
        new ProviderError('rate_limit', 'Too many requests', 'mock'),
      ),
    };

    await expect(
      runMergedCall(mockProvider, 'sys', 'user', 'cv text'),
    ).rejects.toMatchObject({ kind: 'rate_limit' });
  });
});
