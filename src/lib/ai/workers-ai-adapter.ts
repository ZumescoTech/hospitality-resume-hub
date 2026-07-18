// workers-ai-adapter.ts
// Cloudflare Workers AI adapter implementing the AiProvider interface.
// Model: @cf/meta/llama-3.3-70b-instruct-fp8-fast (free tier).
//
// Free tier limits (checked 2026-07): 10,000 neurons/day.
// ~1500-token response ≈ 1 neuron; realistic daily capacity: 5,000+ checks.
//
// The AI binding is obtained from cloudflare:workers env at call time.
// The adapter is only constructed when WORKERS_AI_ENABLED=true in the
// router factory — it is dark-launched (off by default).

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — cloudflare:workers is runtime-only; vitest resolves to a stub
import { env as cfEnv } from 'cloudflare:workers';
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

// Model ID per Cloudflare catalog — do not change without re-testing malformed-JSON rate.
const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

// Minimal type for the AI binding (avoids @cloudflare/workers-types dependency).
interface AiBinding {
  run(
    model: string,
    options: { messages: Array<{ role: string; content: string }>; max_tokens?: number },
  ): Promise<{ response?: string }>;
}

function getAiBinding(): AiBinding | undefined {
  return (cfEnv as Record<string, unknown>)?.AI as AiBinding | undefined;
}

export class WorkersAiAdapter implements AiProvider {
  readonly name = 'workers-ai';

  async analyze({ system, user, signal: _signal }: AnalyzeInput): Promise<RawLlmResponse> {
    const content = await this.call(system, user, 1500);
    return validateAnalysis(content, this.name);
  }

  async callRaw({ system, user }: AnalyzeInput): Promise<string> {
    return this.call(system, user, 3000);
  }

  async extract(cvText: string, _signal?: AbortSignal): Promise<ResumeData> {
    const content = await this.call(
      CV_EXTRACT_SYSTEM_PROMPT,
      `Parse this CV:\n\n"""\n${cvText.slice(0, 8000)}\n"""`,
      2500,
    );
    const validated = validateExtraction(content, this.name);
    return {
      ...(validated as unknown as ResumeData),
      experience:     validated.experience.map((e) => ({ ...e, id: uid() })),
      education:      validated.education.map((e) => ({ ...e, id: uid() })),
      certifications: validated.certifications.map((c) => ({ ...c, id: uid() })),
      templateId: validated.templateId ?? 'vintage',
    };
  }

  private async call(system: string, user: string, maxTokens: number): Promise<string> {
    const ai = getAiBinding();
    if (!ai) {
      throw new ProviderError(
        'server_error',
        'Workers AI binding (AI) is not configured in this environment',
        this.name,
      );
    }
    let result: { response?: string };
    try {
      result = await ai.run(MODEL, {
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
        max_tokens: maxTokens,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Workers AI 429 surfaces as "Too many requests" in the error message
      if (/429|too many requests|rate.?limit/i.test(msg)) {
        throw new ProviderError('rate_limit', msg, this.name, err);
      }
      throw new ProviderError('server_error', msg, this.name, err);
    }

    const text = result?.response ?? '';
    if (!text) {
      throw new ProviderError('bad_json', 'Empty response from Workers AI', this.name);
    }
    return text;
  }
}
