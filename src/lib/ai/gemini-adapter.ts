// gemini-adapter.ts
// Gemini 2.5 Flash adapter implementing the AiProvider interface.
// Uses the Google Generative Language REST API (AI Studio free tier).
//
// Free-tier limits checked July 2026 (console.ai.google.dev):
//   - gemini-2.5-flash: 15 RPM / 1 000 000 TPM / 250 requests/day
//   - JSON response mode: supported via responseMimeType
//
// Key: GEMINI_API_KEY (Cloudflare Worker secret; see .env.example for local dev).

import { CV_EXTRACT_SYSTEM_PROMPT } from './extract-prompt';
import {
  validateAnalysis,
  validateExtraction,
  ProviderError,
  type AiProvider,
  type AnalyzeInput,
} from './provider';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';
import { uid } from '@/lib/utils';

const MODEL = 'gemini-2.5-flash';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Server-side fetch timeout — prevents hung requests when the API is unreachable.
const FETCH_TIMEOUT_MS = 20_000;

export class GeminiAdapter implements AiProvider {
  readonly name = 'gemini';

  constructor(private readonly apiKey: string) {}

  async analyze({ system, user, signal }: AnalyzeInput): Promise<RawLlmResponse> {
    const content = await this.call(
      `${system}\n\n${user}`,
      1500,
      signal,
    );
    return validateAnalysis(content, this.name);
  }

  async callRaw({ system, user, signal }: AnalyzeInput): Promise<string> {
    return this.call(`${system}\n\n${user}`, 3000, signal);
  }

  async extract(cvText: string, signal?: AbortSignal): Promise<ResumeData> {
    const prompt = `${CV_EXTRACT_SYSTEM_PROMPT}\n\nParse this CV:\n\n"""\n${cvText.slice(0, 8000)}\n"""`;
    const content = await this.call(prompt, 2500, signal);
    return applyIds(validateExtraction(content, this.name));
  }

  private async call(prompt: string, maxTokens: number, signal?: AbortSignal): Promise<string> {
    const url = `${API_BASE}/${MODEL}:generateContent?key=${this.apiKey}`;

    const body = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        maxOutputTokens: maxTokens,
        temperature: 0.1,
      },
    });

    // Per-request timeout so a hung connection doesn't block indefinitely.
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), FETCH_TIMEOUT_MS);
    const onCallerAbort = () => timeoutController.abort();
    signal?.addEventListener('abort', onCallerAbort);

    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: timeoutController.signal,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isTimeout = timeoutController.signal.aborted && !signal?.aborted;
      throw new ProviderError('server_error', isTimeout ? `Gemini API timeout after ${FETCH_TIMEOUT_MS}ms` : msg, this.name, err);
    } finally {
      clearTimeout(timeoutId);
      signal?.removeEventListener('abort', onCallerAbort);
    }

    if (res.status === 429) {
      const text = await res.text().catch(() => '');
      throw new ProviderError('rate_limit', `429: ${text}`, this.name);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new ProviderError('server_error', `${res.status}: ${text}`, this.name);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = await res.json() as any;
    const text: string | undefined = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new ProviderError('bad_json', 'No text in Gemini response', this.name);
    return text;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function applyIds(raw: ReturnType<typeof validateExtraction>): ResumeData {
  return {
    ...(raw as unknown as ResumeData),
    experience:     raw.experience.map((e) => ({ ...e, id: uid() })),
    education:      raw.education.map((e) => ({ ...e, id: uid() })),
    certifications: raw.certifications.map((c) => ({ ...c, id: uid() })),
    templateId: raw.templateId ?? 'vintage',
  };
}
