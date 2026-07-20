// Groq client retry behaviour — mocked fetch, no live API calls.
// Covers: 429 → retry → success, retry-after handling, retry exhaustion
// surfacing a readable error, and non-429 errors failing fast.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { groqChatCompletion } from '@/lib/ai/groq-client';
import type { GroqChatBody } from '@/lib/ai/groq-client';

const BODY: GroqChatBody = {
  model: 'llama-3.3-70b-versatile',
  max_tokens: 100,
  temperature: 0,
  messages: [{ role: 'user', content: 'hi' }],
};

// ─── Minimal Response stand-ins ───────────────────────────────────────────────

function res429(retryAfter?: string) {
  return {
    ok: false,
    status: 429,
    headers: { get: (h: string) => (h.toLowerCase() === 'retry-after' ? (retryAfter ?? null) : null) },
    text: async () => '{"error":{"message":"Rate limit reached","type":"tokens","code":"rate_limit_exceeded"}}',
    json: async () => ({}),
  };
}

function resOk(content: string | null) {
  return {
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => '',
    json: async () => ({ choices: [{ message: { content } }] }),
  };
}

function res500() {
  return {
    ok: false,
    status: 500,
    headers: { get: () => null },
    text: async () => 'internal error',
    json: async () => ({}),
  };
}

function mockFetchSequence(...responses: unknown[]) {
  const fn = vi.fn();
  for (const r of responses) fn.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', fn as unknown as typeof fetch);
  return fn;
}

function sleepRecorder() {
  const delays: number[] = [];
  const sleep = async (ms: number) => {
    delays.push(ms);
  };
  return { delays, sleep };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Retry behaviour ──────────────────────────────────────────────────────────

describe('groqChatCompletion — 429 retry with backoff', () => {
  it('retries after a 429 and returns the successful response', async () => {
    const fetchMock = mockFetchSequence(res429(), resOk('rewritten text'));
    const { delays, sleep } = sleepRecorder();

    const content = await groqChatCompletion('key', BODY, { sleep });

    expect(content).toBe('rewritten text');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(delays).toEqual([1000]); // first scheduled backoff step
  });

  it('succeeds within the max attempts across consecutive 429s', async () => {
    const fetchMock = mockFetchSequence(res429(), res429(), resOk('ok'));
    const { delays, sleep } = sleepRecorder();

    const content = await groqChatCompletion('key', BODY, { maxRetries: 2, sleep });

    expect(content).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(delays).toEqual([1000, 3000]); // escalating backoff
  });

  it('honours the retry-after header over the scheduled delay', async () => {
    mockFetchSequence(res429('4'), resOk('ok'));
    const { delays, sleep } = sleepRecorder();

    await groqChatCompletion('key', BODY, { sleep });

    expect(delays).toEqual([4000]);
  });

  it('throws a readable error once retries are exhausted', async () => {
    const fetchMock = mockFetchSequence(res429(), res429(), res429());
    const { sleep } = sleepRecorder();

    // The message must stay recognisably an upstream API failure — the checker
    // UI maps any such error to its generic readable toast, and logs the text.
    await expect(groqChatCompletion('key', BODY, { maxRetries: 2, sleep })).rejects.toThrow(
      /Groq API error 429/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3); // initial + 2 retries, then gave up
  });

  it('fails fast when retry-after exceeds the wait the UX can absorb', async () => {
    const fetchMock = mockFetchSequence(res429('45'));
    const { delays, sleep } = sleepRecorder();

    await expect(groqChatCompletion('key', BODY, { sleep })).rejects.toThrow(/Groq API error 429/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]); // never slept — a 45s wait would outlive the client timeout
  });

  it('does not retry when maxRetries is 0 (grammar-pass contract)', async () => {
    const fetchMock = mockFetchSequence(res429());
    const { delays, sleep } = sleepRecorder();

    await expect(groqChatCompletion('key', BODY, { maxRetries: 0, sleep })).rejects.toThrow(
      /Groq API error 429/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });
});

// ─── Non-429 failures ─────────────────────────────────────────────────────────

describe('groqChatCompletion — non-retryable failures', () => {
  it('throws immediately on a 500 without retrying', async () => {
    const fetchMock = mockFetchSequence(res500(), resOk('never reached'));
    const { delays, sleep } = sleepRecorder();

    await expect(groqChatCompletion('key', BODY, { sleep })).rejects.toThrow(/Groq API error 500/);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(delays).toEqual([]);
  });

  it('throws when the response has no content', async () => {
    mockFetchSequence(resOk(null));
    await expect(groqChatCompletion('key', BODY)).rejects.toThrow(/No content in Groq response/);
  });
});
