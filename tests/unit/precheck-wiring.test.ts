import { describe, it, expect } from 'vitest';
import {
  PRECHECK_ROLE_BY_SLUG,
  resolvePrecheck,
  toPrecheckSummary,
  withPrecheck,
} from '@/lib/precheck/wiring';
import type { CvScoreResult } from '@/lib/cruiseCvRubric';
import type { PrecheckResult } from '@/lib/precheck/types';

const CABIN_CV =
  'Cabin steward. Cleaned and serviced staterooms, turndown service, changed linen and made beds. 2018 - 2023.';

const fakeResult = (): CvScoreResult => ({
  overallScore: 60,
  tier: 'Needs Work',
  categories: {} as CvScoreResult['categories'],
  topFixes: [],
  matchedKeywords: [],
  missingKeywords: [],
});

describe('precheck wiring', () => {
  it('maps the cabin slug and leaves unknown slugs unmapped', () => {
    expect(PRECHECK_ROLE_BY_SLUG['cabin-steward-stewardess']).toBe('cabin-steward');
    expect(PRECHECK_ROLE_BY_SLUG['sommelier-wine-waiter']).toBeUndefined();
  });

  it('resolvePrecheck respects the enabled flag and the slug map', () => {
    expect(resolvePrecheck(CABIN_CV, 'cabin-steward-stewardess', false)).toBeNull(); // flag off
    expect(resolvePrecheck(CABIN_CV, 'sommelier-wine-waiter', true)).toBeNull(); // unmapped role
    const r = resolvePrecheck(CABIN_CV, 'cabin-steward-stewardess', true);
    expect(r).not.toBeNull();
    expect(typeof r!.score).toBe('number');
  });

  it('toPrecheckSummary carries the aiSkipped flag and maps every field', () => {
    const res: PrecheckResult = {
      score: 42,
      hardGateFailures: ['STCW not found'],
      matchedTerms: ['housekeeping'],
      missingCoreTerms: ['stcw'],
    };
    expect(toPrecheckSummary(res, true)).toEqual({
      score: 42,
      hardGateFailures: ['STCW not found'],
      matchedTerms: ['housekeeping'],
      missingCoreTerms: ['stcw'],
      aiSkipped: true,
    });
  });

  it('withPrecheck is a no-op when there is no pre-check, and never mutates', () => {
    const base = fakeResult();
    expect(withPrecheck(base, null, false)).toBe(base); // unchanged reference
    expect(base.precheck).toBeUndefined();

    const res: PrecheckResult = { score: 1, hardGateFailures: [], matchedTerms: [], missingCoreTerms: [] };
    const attached = withPrecheck(base, res, false);
    expect(attached).not.toBe(base);
    expect(attached.precheck?.score).toBe(1);
    expect(base.precheck).toBeUndefined(); // original still clean
  });
});
