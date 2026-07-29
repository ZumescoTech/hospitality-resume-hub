// wiring.ts
// Pure glue between the app's CV-check flow and the local pre-checker. Kept
// free of server/Cloudflare imports so it is unit-testable in isolation.

import type { CvScoreResult, PrecheckSummary } from '@/lib/cruiseCvRubric';
import { precheckCv } from './prechecker';
import type { PrecheckResult, RoleType } from './types';

/**
 * Maps an app role slug (cruise-roles.json) onto a pre-check term-bank role.
 * Roles with no entry skip the pre-check entirely — no behaviour change.
 */
export const PRECHECK_ROLE_BY_SLUG: Record<string, RoleType> = {
  'cabin-steward-stewardess': 'cabin-steward',
  'youth-staff': 'staff-youth',
};

/** Run the pre-check for a slug, or return null when disabled/unmapped. */
export function resolvePrecheck(
  cvText: string,
  roleSlug: string,
  enabled: boolean,
): PrecheckResult | null {
  const role = PRECHECK_ROLE_BY_SLUG[roleSlug];
  return enabled && role ? precheckCv(cvText, role) : null;
}

export function toPrecheckSummary(res: PrecheckResult, aiSkipped: boolean): PrecheckSummary {
  return {
    score: res.score,
    hardGateFailures: res.hardGateFailures,
    matchedTerms: res.matchedTerms,
    missingCoreTerms: res.missingCoreTerms,
    aiSkipped,
  };
}

/** Attach a fresh pre-check summary to a result. Never mutates the input. */
export function withPrecheck(
  result: CvScoreResult,
  precheck: PrecheckResult | null,
  aiSkipped: boolean,
): CvScoreResult {
  if (!precheck) return result;
  return { ...result, precheck: toPrecheckSummary(precheck, aiSkipped) };
}
