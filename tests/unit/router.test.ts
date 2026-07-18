/**
 * T2.4 — Failover router unit tests
 *
 * Tests:
 *   - primary-ok: uses 1 call, returns result
 *   - primary-429 → fallback-ok: returns success after 2 calls
 *   - both-fail: throws ProviderError{kind:'exhausted'}
 *   - same tests for extract()
 */

import { describe, it, expect, vi } from 'vitest';
import { AiRouter } from '@/lib/ai/router';
import { ProviderError, type AiProvider, type AnalyzeInput } from '@/lib/ai/provider';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_ANALYSIS: RawLlmResponse = {
  keywordAlignment:       { score: 75, feedback: 'ok' },
  experienceDepth:        { score: 75, feedback: 'ok' },
  quantifiedAchievements: { score: 75, feedback: 'ok' },
  qualifications:         { score: 75, feedback: 'ok' },
  cruiseReadiness:        { score: 75, feedback: 'ok' },
  atsParseability:        { score: 75, feedback: 'ok' },
  summaryQuality:         { score: 75, feedback: 'ok' },
  topFixes: [],
} as RawLlmResponse;

const MOCK_RESUME: ResumeData = {
  personal: { fullName: 'Test', title: '', email: '', phone: '', location: '' },
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  hospitality: { serviceStyles: [], posSystems: [], wineKnowledge: 'None', spiritsKnowledge: 'None', languages: [], allergens: false },
  templateId: 'vintage',
} as ResumeData;

function makeMockProvider(name: string, behavior: 'ok' | 'rate_limit' | 'bad_json' | 'server_error'): AiProvider {
  const err = behavior !== 'ok'
    ? new ProviderError(behavior, `${name} failed`, name)
    : null;
  return {
    name,
    analyze: vi.fn().mockImplementation(() => err ? Promise.reject(err) : Promise.resolve(MOCK_ANALYSIS)),
    extract: vi.fn().mockImplementation(() => err ? Promise.reject(err) : Promise.resolve(MOCK_RESUME)),
  };
}

// ─── analyze() routing ────────────────────────────────────────────────────────

describe('AiRouter.analyze()', () => {
  const INPUT: AnalyzeInput = { system: 'sys', user: 'usr' };

  it('primary-ok: returns result, calls primary once, never calls fallback', async () => {
    const primary = makeMockProvider('groq', 'ok');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.analyze(INPUT);
    expect(result.keywordAlignment.score).toBe(75);
    expect(primary.analyze).toHaveBeenCalledTimes(1);
    expect(fallback.analyze).not.toHaveBeenCalled();
  });

  it('primary-429 → fallback-ok: returns success after 2 total calls', async () => {
    const primary = makeMockProvider('groq', 'rate_limit');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.analyze(INPUT);
    expect(result.keywordAlignment.score).toBe(75);
    expect(primary.analyze).toHaveBeenCalledTimes(1);
    expect(fallback.analyze).toHaveBeenCalledTimes(1);
  });

  it('primary-server_error → fallback-ok: falls over correctly', async () => {
    const primary = makeMockProvider('groq', 'server_error');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.analyze(INPUT);
    expect(result).toBe(MOCK_ANALYSIS);
  });

  it('primary-bad_json → fallback-ok: falls over on bad_json', async () => {
    const primary = makeMockProvider('groq', 'bad_json');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.analyze(INPUT);
    expect(result).toBe(MOCK_ANALYSIS);
  });

  it('both-fail: throws ProviderError{kind:exhausted}', async () => {
    const primary = makeMockProvider('groq', 'rate_limit');
    const fallback = makeMockProvider('gemini', 'server_error');
    const router = new AiRouter(primary, fallback);

    await expect(router.analyze(INPUT))
      .rejects.toMatchObject({ kind: 'exhausted' });
  });

  it('exhausted error is an instance of ProviderError', async () => {
    const primary = makeMockProvider('groq', 'server_error');
    const fallback = makeMockProvider('gemini', 'server_error');
    const router = new AiRouter(primary, fallback);

    try {
      await router.analyze(INPUT);
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
      expect((err as ProviderError).kind).toBe('exhausted');
    }
  });
});

// ─── extract() routing ────────────────────────────────────────────────────────

describe('AiRouter.extract()', () => {
  it('primary-ok: returns result from primary only', async () => {
    const primary = makeMockProvider('groq', 'ok');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.extract('some cv text');
    expect(result.personal.fullName).toBe('Test');
    expect(primary.extract).toHaveBeenCalledTimes(1);
    expect(fallback.extract).not.toHaveBeenCalled();
  });

  it('primary-rate_limit → fallback-ok: uses fallback', async () => {
    const primary = makeMockProvider('groq', 'rate_limit');
    const fallback = makeMockProvider('gemini', 'ok');
    const router = new AiRouter(primary, fallback);

    const result = await router.extract('cv text');
    expect(result).toBe(MOCK_RESUME);
    expect(fallback.extract).toHaveBeenCalledTimes(1);
  });

  it('both-fail: throws ProviderError{kind:exhausted}', async () => {
    const primary = makeMockProvider('groq', 'server_error');
    const fallback = makeMockProvider('gemini', 'server_error');
    const router = new AiRouter(primary, fallback);

    await expect(router.extract('cv text'))
      .rejects.toMatchObject({ kind: 'exhausted' });
  });
});
