/**
 * T2.3 — Gemini adapter unit tests (mocked fetch)
 *
 * Tests: happy path, 429 → rate_limit, malformed JSON → bad_json, 500 → server_error.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GeminiAdapter } from '@/lib/ai/gemini-adapter';
import { ProviderError } from '@/lib/ai/provider';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ANALYSIS_JSON = JSON.stringify({
  keywordAlignment:       { score: 72, feedback: 'Match ok.' },
  experienceDepth:        { score: 78, feedback: 'Good.' },
  quantifiedAchievements: { score: 60, feedback: 'Some.' },
  qualifications:         { score: 68, feedback: 'WSET.' },
  cruiseReadiness:        { score: 55, feedback: 'STCW.' },
  atsParseability:        { score: 82, feedback: 'Clean.' },
  summaryQuality:         { score: 70, feedback: 'Ok.' },
  topFixes: ['Fix A', 'Fix B'],
});

const VALID_EXTRACTION_JSON = JSON.stringify({
  personal: { fullName: 'Gemini Test', title: 'Bartender', email: 'g@example.com', phone: '+1', location: 'Miami' },
  summary: 'Experienced bartender.',
  experience: [{ role: 'Bartender', venue: 'Cruise Ship', startDate: '2022-06', endDate: '', current: true, bullets: ['Mixed cocktails.'] }],
  education: [],
  skills: ['Mixology'],
  certifications: [],
  hospitality: { serviceStyles: [], posSystems: [], wineKnowledge: 'None', spiritsKnowledge: 'Advanced', languages: [], allergens: false },
});

function geminiOkResponse(text: string) {
  return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }), text: async () => '' };
}

function geminiErrorResponse(status: number, body = '') {
  return { ok: false, status, json: async () => ({}), text: async () => body, headers: { get: () => null } };
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

const adapter = new GeminiAdapter('test-gemini-key');

// ─── analyze() ────────────────────────────────────────────────────────────────

describe('GeminiAdapter.analyze()', () => {
  it('returns validated RawLlmResponse on happy path', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiOkResponse(VALID_ANALYSIS_JSON) as Response);
    const result = await adapter.analyze({ system: 'sys', user: 'usr' });
    expect(result.keywordAlignment.score).toBe(72);
    expect(result.topFixes).toHaveLength(2);
  });

  it('repairs markdown-fenced JSON', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiOkResponse('```json\n' + VALID_ANALYSIS_JSON + '\n```') as Response);
    const result = await adapter.analyze({ system: 'sys', user: 'usr' });
    expect(result.experienceDepth.score).toBe(78);
  });

  it('throws ProviderError{rate_limit} on HTTP 429', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiErrorResponse(429, 'quota exceeded') as Response);
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'rate_limit', provider: 'gemini' });
  });

  it('throws ProviderError{server_error} on HTTP 500', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiErrorResponse(500, 'Internal') as Response);
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'server_error', provider: 'gemini' });
  });

  it('throws ProviderError{bad_json} on malformed LLM text', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiOkResponse('not json at all') as Response);
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'bad_json', provider: 'gemini' });
  });

  it('throws ProviderError{bad_json} when no text in response', async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [] }) } as Response);
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'bad_json' });
  });

  it('all errors are instances of ProviderError', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiErrorResponse(429) as Response);
    try {
      await adapter.analyze({ system: 'sys', user: 'usr' });
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
    }
  });
});

// ─── extract() ────────────────────────────────────────────────────────────────

describe('GeminiAdapter.extract()', () => {
  it('returns ResumeData with application-assigned IDs', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiOkResponse(VALID_EXTRACTION_JSON) as Response);
    const result = await adapter.extract('Some cv text about hospitality.');
    expect(result.personal.fullName).toBe('Gemini Test');
    expect(result.experience[0].id).toBeTruthy();
  });

  it('throws ProviderError{bad_json} on malformed extraction', async () => {
    vi.mocked(fetch).mockResolvedValue(geminiOkResponse('{"personal": {"fullName": "trunc') as Response);
    await expect(adapter.extract('cv'))
      .rejects.toMatchObject({ kind: 'bad_json' });
  });
});
