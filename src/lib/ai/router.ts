// router.ts
// Provider failover router.
// Tries the primary adapter; on ProviderError(rate_limit | server_error | bad_json)
// retries ONCE on the fallback adapter.  Both fail => ProviderError{kind:'exhausted'}.
//
// Structured log per attempt: { provider, ms, outcome }

import { ProviderError, type AiProvider, type AnalyzeInput } from './provider';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';

type Outcome = 'ok' | 'rate_limit' | 'server_error' | 'bad_json' | 'exhausted';

interface AttemptLog {
  provider: string;
  ms: number;
  outcome: Outcome;
}

function log(entry: AttemptLog) {
  // CV text and personal fields never appear in logs.
  console.log(`[ai-router] ${entry.provider} ${entry.outcome} ${entry.ms}ms`);
}

async function attempt<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ ok: true; value: T; log: AttemptLog } | { ok: false; kind: ProviderError['kind']; log: AttemptLog }> {
  const start = Date.now();
  try {
    const value = await fn();
    const entry: AttemptLog = { provider: name, ms: Date.now() - start, outcome: 'ok' };
    log(entry);
    return { ok: true, value, log: entry };
  } catch (err) {
    const kind: ProviderError['kind'] =
      err instanceof ProviderError ? err.kind : 'server_error';
    const entry: AttemptLog = { provider: name, ms: Date.now() - start, outcome: kind };
    log(entry);
    return { ok: false, kind, log: entry };
  }
}

export class AiRouter implements AiProvider {
  readonly name = 'router';

  constructor(
    private readonly primary: AiProvider,
    private readonly fallback: AiProvider,
  ) {}

  async analyze(input: AnalyzeInput): Promise<RawLlmResponse> {
    const first = await attempt(this.primary.name, () => this.primary.analyze(input));
    if (first.ok) return first.value;

    const second = await attempt(this.fallback.name, () => this.fallback.analyze(input));
    if (second.ok) return second.value;

    throw new ProviderError(
      'exhausted',
      `Both providers failed. primary=${first.log.outcome} fallback=${second.log.outcome}`,
    );
  }

  async callRaw(input: AnalyzeInput): Promise<string> {
    const first = await attempt(this.primary.name, () => this.primary.callRaw(input));
    if (first.ok) return first.value;

    const second = await attempt(this.fallback.name, () => this.fallback.callRaw(input));
    if (second.ok) return second.value;

    throw new ProviderError(
      'exhausted',
      `Both providers failed. primary=${first.log.outcome} fallback=${second.log.outcome}`,
    );
  }

  async extract(cvText: string, signal?: AbortSignal): Promise<ResumeData> {
    const first = await attempt(this.primary.name, () => this.primary.extract(cvText, signal));
    if (first.ok) return first.value;

    const second = await attempt(this.fallback.name, () => this.fallback.extract(cvText, signal));
    if (second.ok) return second.value;

    throw new ProviderError(
      'exhausted',
      `Both providers failed. primary=${first.log.outcome} fallback=${second.log.outcome}`,
    );
  }
}

/** Factory used by server functions.  Reads API keys from env at call time. */
export function createRouter(env: { GROQ_API_KEY?: string; GEMINI_API_KEY?: string }): AiRouter {
  // Import dynamically at call time so the module graph stays side-effect free.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GroqAdapter } = require('./groq-adapter') as typeof import('./groq-adapter');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GeminiAdapter } = require('./gemini-adapter') as typeof import('./gemini-adapter');

  const groqKey = env.GROQ_API_KEY ?? '';
  const geminiKey = env.GEMINI_API_KEY ?? '';

  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');

  const primary = new GroqAdapter(groqKey);
  // If Gemini key absent, use Groq as fallback too (Groq retries on its own 429 backoff).
  const fallback = geminiKey ? new GeminiAdapter(geminiKey) : new GroqAdapter(groqKey);

  return new AiRouter(primary, fallback);
}
