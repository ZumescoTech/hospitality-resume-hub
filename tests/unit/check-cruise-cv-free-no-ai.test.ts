/**
 * Free-tier guardrail: runCruiseCvCheck({ tier: 'free' }) must never construct
 * a router or touch an AI provider.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const { createRouter, runMergedCall } = vi.hoisted(() => ({
  createRouter: vi.fn(async () => {
    throw new Error('createRouter must not be called on the free tier');
  }),
  runMergedCall: vi.fn(async () => {
    throw new Error('runMergedCall must not be called on the free tier');
  }),
}));

vi.mock('@/lib/ai/router', () => ({ createRouter }));
vi.mock('@/lib/ai/merged-call', () => ({ runMergedCall }));
vi.mock('@/lib/ai/groq-adapter', () => ({
  GroqAdapter: class {
    constructor() {
      throw new Error('GroqAdapter must not be constructed on the free tier');
    }
  },
}));
vi.mock('@/lib/ai/gemini-adapter', () => ({
  GeminiAdapter: class {
    constructor() {
      throw new Error('GeminiAdapter must not be constructed on the free tier');
    }
  },
}));
vi.mock('@/lib/ai/workers-ai-adapter', () => ({
  WorkersAiAdapter: class {
    constructor() {
      throw new Error('WorkersAiAdapter must not be constructed on the free tier');
    }
  },
}));

import { runCruiseCvCheck } from '@/lib/cruise-cv-check';

const CV = readFileSync(resolve(__dirname, '../fixtures/cvs/waiter-experienced.txt'), 'utf8');

describe('free-tier checkCruiseCv — zero AI construction', () => {
  beforeEach(() => {
    createRouter.mockClear();
    runMergedCall.mockClear();
  });

  it('does not call createRouter, runMergedCall, or construct a provider', async () => {
    const outcome = await runCruiseCvCheck({
      cvText: CV,
      roleSlug: 'waiter-waitress',
      tier: 'free',
    });

    expect(outcome.kind).toBe('scored');
    expect(createRouter).not.toHaveBeenCalled();
    expect(runMergedCall).not.toHaveBeenCalled();
  });

  it('returns a complete local CvScoreResult', async () => {
    const outcome = await runCruiseCvCheck({
      cvText: CV,
      roleSlug: 'waiter-waitress',
      tier: 'free',
    });
    if (outcome.kind !== 'scored') throw new Error(`expected scored, got ${outcome.kind}`);
    expect(typeof outcome.result.overallScore).toBe('number');
    expect(outcome.result.overallScore).toBeGreaterThanOrEqual(0);
    expect(outcome.result.overallScore).toBeLessThanOrEqual(100);
    expect(outcome.result.categories.keywordAlignment).toBeDefined();
    expect(outcome.result.categories.experienceDepth).toBeDefined();
    expect(outcome.result.isDegraded).toBeUndefined();
  });
});
