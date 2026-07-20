/**
 * T2.2 — Groq adapter unit tests (mocked fetch)
 *
 * Tests:
 *   - analyze() happy path returns validated RawLlmResponse
 *   - analyze() on HTTP 429 throws ProviderError{kind:'rate_limit'}
 *   - analyze() on malformed JSON throws ProviderError{kind:'bad_json'}
 *   - extract() happy path returns ResumeData with application-assigned IDs
 *   - Golden-file scores still green (import-level regression)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GroqAdapter } from '@/lib/ai/groq-adapter';
import { ProviderError } from '@/lib/ai/provider';
import { computeCvScore } from '@/lib/cruiseCvRubric';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_ANALYSIS_JSON = JSON.stringify({
  keywordAlignment:       { score: 78, feedback: 'Good match.' },
  experienceDepth:        { score: 82, feedback: 'Strong.' },
  quantifiedAchievements: { score: 65, feedback: 'Some metrics.' },
  qualifications:         { score: 70, feedback: 'WSET present.' },
  cruiseReadiness:        { score: 60, feedback: 'STCW listed.' },
  atsParseability:        { score: 88, feedback: 'Clean.' },
  summaryQuality:         { score: 75, feedback: 'Focused.' },
  topFixes: ['Mention Micros POS', 'Quantify covers'],
});

const VALID_EXTRACTION_JSON = JSON.stringify({
  personal: { fullName: 'Test Candidate', title: 'Waiter', email: 'tc@example.com', phone: '+44 1', location: 'London' },
  summary: 'Experienced waiter.',
  experience: [{ role: 'Waiter', venue: 'The Grand', startDate: '2020-01', endDate: '', current: true, bullets: ['Served 150 covers.'] }],
  education: [],
  skills: ['Silver service'],
  certifications: [{ name: 'STCW', issuer: 'RYA', year: '2022' }],
  hospitality: { serviceStyles: [], posSystems: [], wineKnowledge: 'Beginner', spiritsKnowledge: 'None', languages: [], allergens: false },
});

// ─── Mock fetch ───────────────────────────────────────────────────────────────

function mockFetchOk(body: string) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ choices: [{ message: { content: body } }] }),
    headers: { get: () => null },
  }));
}

function mockFetchStatus(status: number, text = '') {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => text,
    headers: { get: () => null },
  }));
}

beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
afterEach(() => { vi.unstubAllGlobals(); });

const adapter = new GroqAdapter('test-key');

// ─── analyze() ────────────────────────────────────────────────────────────────

describe('GroqAdapter.analyze()', () => {
  it('returns validated RawLlmResponse on happy path', async () => {
    mockFetchOk(VALID_ANALYSIS_JSON);
    const result = await adapter.analyze({ system: 'sys', user: 'usr' });
    expect(result.keywordAlignment.score).toBe(78);
    expect(result.topFixes).toHaveLength(2);
  });

  it('throws ProviderError{rate_limit} on HTTP 429', async () => {
    mockFetchStatus(429, 'Rate limit exceeded');
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'rate_limit', provider: 'groq' });
  });

  it('throws ProviderError{bad_json} on malformed LLM response', async () => {
    mockFetchOk('not valid json at all');
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'bad_json', provider: 'groq' });
  });

  it('throws ProviderError{bad_json} on truncated JSON', async () => {
    mockFetchOk('{"keywordAlignment": {"score": 78');
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'bad_json' });
  });

  it('throws ProviderError{server_error} on HTTP 500', async () => {
    mockFetchStatus(500, 'Internal error');
    await expect(adapter.analyze({ system: 'sys', user: 'usr' }))
      .rejects.toMatchObject({ kind: 'server_error', provider: 'groq' });
  });

  it('repairs markdown-fenced JSON from the LLM', async () => {
    mockFetchOk('```json\n' + VALID_ANALYSIS_JSON + '\n```');
    const result = await adapter.analyze({ system: 'sys', user: 'usr' });
    expect(result.experienceDepth.score).toBe(82);
  });

  it('all errors are instances of ProviderError', async () => {
    mockFetchStatus(429, 'Rate limit');
    try {
      await adapter.analyze({ system: 'sys', user: 'usr' });
    } catch (err) {
      expect(err).toBeInstanceOf(ProviderError);
    }
  });
});

// ─── extract() ────────────────────────────────────────────────────────────────

describe('GroqAdapter.extract()', () => {
  it('returns ResumeData with application-assigned IDs', async () => {
    mockFetchOk(VALID_EXTRACTION_JSON);
    const result = await adapter.extract('Some CV text about hospitality.');
    expect(result.personal.fullName).toBe('Test Candidate');
    expect(result.experience[0].id).toBeTruthy();
    expect(result.certifications[0].id).toBeTruthy();
  });

  it('throws ProviderError{bad_json} on malformed extraction', async () => {
    mockFetchOk('{"personal": {"fullName": "truncated"');
    await expect(adapter.extract('cv text'))
      .rejects.toMatchObject({ kind: 'bad_json' });
  });
});

// ─── Golden-file regression ───────────────────────────────────────────────────

describe('Golden-file regression — computeCvScore unaffected by adapter import', () => {
  it('waiter-experienced golden score still 79', () => {
    const llm = {
      keywordAlignment:       { score: 80, feedback: '' },
      experienceDepth:        { score: 82, feedback: '' },
      quantifiedAchievements: { score: 70, feedback: '' },
      qualifications:         { score: 75, feedback: '' },
      cruiseReadiness:        { score: 85, feedback: '' },
      atsParseability:        { score: 80, feedback: '' },
      summaryQuality:         { score: 75, feedback: '' },
      topFixes: [],
    } as Parameters<typeof computeCvScore>[0];
    expect(computeCvScore(llm, [], []).overallScore).toBe(79);
  });
});
