// router.ts
// Provider failover router.
// Tries the primary adapter; on ProviderError(rate_limit | server_error | bad_json)
// retries ONCE on the fallback adapter.  Both fail => ProviderError{kind:'exhausted'}.
//
// Structured log per attempt: { provider, ms, outcome }

import { ProviderError, type AiProvider, type AnalyzeInput } from './provider';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';
import { recordApiAttempt } from '@/lib/telemetry';

type Outcome = 'ok' | 'rate_limit' | 'server_error' | 'bad_json' | 'exhausted';

interface AttemptLog {
  provider: string;
  ms: number;
  outcome: Outcome;
}

function log(entry: AttemptLog) {
  // CV text and personal fields never appear in logs.
  console.log(`[ai-router] ${entry.provider} ${entry.outcome} ${entry.ms}ms`);
  recordApiAttempt(entry.provider, entry.outcome, entry.ms);
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

    // Retry primary once on bad_json (transient truncation) before switching providers
    if (first.kind === 'bad_json') {
      const retry = await attempt(this.primary.name, () => this.primary.analyze(input));
      if (retry.ok) return retry.value;
    }

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
export async function createRouter(env: {
  GROQ_API_KEY?: string;
  GEMINI_API_KEY?: string;
  /** Feature flag: add Workers AI as third provider in failover chain. Default: false (dark launch). */
  WORKERS_AI_ENABLED?: string;
}): Promise<AiRouter> {
  const { GroqAdapter } = await import('./groq-adapter');
  const { GeminiAdapter } = await import('./gemini-adapter');

  const groqKey = env.GROQ_API_KEY ?? '';
  const geminiKey = env.GEMINI_API_KEY ?? '';
  const workersAiEnabled = env.WORKERS_AI_ENABLED === 'true';

  if (!groqKey) throw new Error('GROQ_API_KEY is not configured');

  const primary = new GroqAdapter(groqKey);

  let fallback: AiProvider;
  if (workersAiEnabled) {
    const { WorkersAiAdapter } = await import('./workers-ai-adapter');
    const second: AiProvider = geminiKey ? new GeminiAdapter(geminiKey) : new GroqAdapter(groqKey);
    fallback = new AiRouter(second, new WorkersAiAdapter());
    console.log('[ai-router] WORKERS_AI_ENABLED: chain = groq → gemini → workers-ai');
  } else {
    fallback = geminiKey ? new GeminiAdapter(geminiKey) : new GroqAdapter(groqKey);
  }

  return new AiRouter(primary, fallback);
}
