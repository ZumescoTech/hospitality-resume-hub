/**
 * Builder import must degrade to the deterministic local parse when the AI
 * providers are exhausted or unconfigured — never surface a raw provider error.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ProviderError } from '@/lib/ai/provider';

const createRouterMock = vi.fn();
vi.mock('@/lib/ai/router', async (orig) => ({
  ...(await orig<typeof import('@/lib/ai/router')>()),
  createRouter: (...args: unknown[]) => createRouterMock(...args),
}));

const { runParseCvForBuilder } = await import('@/lib/parseCvForBuilder');
const { parseCvLocally } = await import('@/lib/cvExtractDeterministic');
const { failureDetail } = await import('@/lib/ai/router');

const CV = readFileSync(join(__dirname, '../fixtures/cvs/waiter-experienced.txt'), 'utf-8');

afterEach(() => createRouterMock.mockReset());

describe('runParseCvForBuilder degradation', () => {
  it('falls back to the local parse when both providers are exhausted', async () => {
    createRouterMock.mockResolvedValue({
      extract: vi.fn().mockRejectedValue(
        new ProviderError('exhausted', 'Both providers failed. primary=server_error fallback=server_error'),
      ),
    });

    const result = await runParseCvForBuilder(CV);
    const local = parseCvLocally(CV);

    expect(result.personal).toEqual(local.personal);
    expect(result.experience.length).toBe(local.experience.length);
    expect(result.experience.every((e) => e.id)).toBe(true);
  });

  it('falls back to the local parse when no provider key is configured', async () => {
    createRouterMock.mockRejectedValue(new Error('GROQ_API_KEY is not configured'));

    const result = await runParseCvForBuilder(CV);

    expect(result.personal).toEqual(parseCvLocally(CV).personal);
  });
});

describe('failureDetail', () => {
  it('redacts API keys and truncates', () => {
    const detail = failureDetail(new Error(`fetch failed ?key=AIzaSECRET123 ${'x'.repeat(500)}`));
    expect(detail).not.toContain('AIzaSECRET123');
    expect(detail).toContain('key=REDACTED');
    expect(detail.length).toBeLessThanOrEqual(200);
  });
});
