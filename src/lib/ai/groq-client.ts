// groq-client.ts
// Shared Groq chat-completions client for all server-side AI calls.
// Centralises the endpoint, auth header, and 429 retry-with-backoff so the
// per-minute token limit on the free tier degrades to a short wait instead
// of a user-facing failure.

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Backoff schedule per retry attempt. Groq's retry-after header, when
// present, overrides the scheduled delay for that attempt.
const RETRY_DELAYS_MS = [1000, 3000, 8000];

// If Groq asks us to wait longer than this, fail immediately — the checker's
// client-side 35s analysis timeout would expire before the retry landed.
const MAX_RETRY_DELAY_MS = 15_000;

export interface GroqChatBody {
  model: string;
  max_tokens: number;
  temperature: number;
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
}

export interface GroqCallOptions {
  /** Retries after the first attempt on 429 responses only. Default 2. */
  maxRetries?: number;
  /** Abort signal forwarded to fetch (used by the 4s grammar-check budget). */
  signal?: AbortSignal;
  /** Test seam — replaces the real delay between retries. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Calls Groq chat completions and returns the first choice's message content.
 * Retries on HTTP 429 with exponential backoff (respecting retry-after);
 * any other non-OK status or a missing content field throws immediately.
 */
export async function groqChatCompletion(
  apiKey: string,
  body: GroqChatBody,
  options: GroqCallOptions = {},
): Promise<string> {
  const { maxRetries = 2, signal } = options;
  const sleep = options.sleep ?? defaultSleep;

  let attempt = 0;
  for (;;) {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal,
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < maxRetries) {
      const retryAfterSec = Number(response.headers.get('retry-after'));
      const delayMs =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0
          ? retryAfterSec * 1000
          : RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)];

      if (delayMs <= MAX_RETRY_DELAY_MS) {
        await sleep(delayMs);
        attempt += 1;
        continue;
      }
      // Requested wait exceeds what the UX can absorb — fall through and throw.
    }

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Groq API error ${response.status}: ${err}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error('No content in Groq response');
    return content;
  }
}
