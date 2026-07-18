// groq-adapter.ts
// Groq adapter implementing the AiProvider interface.
// Wraps groq-client.ts; applies boundary validation for every response.

import { groqChatCompletion } from './groq-client';
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

const MODEL = 'llama-3.3-70b-versatile';

export class GroqAdapter implements AiProvider {
  readonly name = 'groq';

  constructor(private readonly apiKey: string) {}

  async analyze({ system, user, signal }: AnalyzeInput): Promise<RawLlmResponse> {
    let content: string;
    try {
      content = await groqChatCompletion(
        this.apiKey,
        { model: MODEL, max_tokens: 1500, temperature: 0.1,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }] },
        { signal },
      );
    } catch (err) {
      throw mapGroqError(err, this.name);
    }
    return validateAnalysis(content, this.name);
  }

  async extract(cvText: string, signal?: AbortSignal): Promise<ResumeData> {
    let content: string;
    try {
      content = await groqChatCompletion(
        this.apiKey,
        { model: MODEL, max_tokens: 2500, temperature: 0.0,
          messages: [
            { role: 'system', content: CV_EXTRACT_SYSTEM_PROMPT },
            { role: 'user', content: `Parse this CV:\n\n"""\n${cvText.slice(0, 8000)}\n"""` },
          ] },
        { signal },
      );
    } catch (err) {
      throw mapGroqError(err, this.name);
    }
    return applyIds(validateExtraction(content, this.name));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mapGroqError(err: unknown, provider: string): ProviderError {
  const msg = err instanceof Error ? err.message : String(err);
  if (/429|rate.?limit/i.test(msg)) return new ProviderError('rate_limit', msg, provider, err);
  return new ProviderError('server_error', msg, provider, err);
}

/** Add application-generated IDs to array items that the LLM omits. */
function applyIds(raw: ReturnType<typeof validateExtraction>): ResumeData {
  return {
    ...(raw as unknown as ResumeData),
    experience:     raw.experience.map((e) => ({ ...e, id: uid() })),
    education:      raw.education.map((e) => ({ ...e, id: uid() })),
    certifications: raw.certifications.map((c) => ({ ...c, id: uid() })),
    templateId: raw.templateId ?? 'vintage',
  };
}
