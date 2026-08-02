// wiring.ts
// Pure glue between the app's CV-check flow and the local pre-checker. Kept
// free of server/Cloudflare imports so it is unit-testable in isolation.

import type { CvScoreResult, PrecheckSummary } from '@/lib/cruiseCvRubric';
import { precheckCv } from './prechecker';
import { certificationGate } from './certGate';
import type { PrecheckResult, RoleType } from './types';

/**
 * Maps an app role slug (cruise-roles.json) onto a pre-check term-bank role.
 * Roles with no entry have no keyword term-bank, but may still surface a
 * role-conditional certification gate (see certGate.ts / Sommelier).
 */
export const PRECHECK_ROLE_BY_SLUG: Record<string, RoleType> = {
  'cabin-steward-stewardess': 'cabin-steward',
  'youth-staff': 'staff-youth',
};

/**
 * Run the pre-check for a slug. Returns:
 *   - null when disabled, OR when the role has neither a term-bank nor an active
 *     certification gate (nothing to surface — unchanged "skip" behaviour).
 *   - a PrecheckResult otherwise. The role-conditional certification gate (only
 *     Sommelier / Wine Waiter today) is folded into `hardGateFailures` so it
 *     rides the same short-circuit + UI path as the term-bank pre-check.
 */
export function resolvePrecheck(
  cvText: string,
  roleSlug: string,
  enabled: boolean,
): PrecheckResult | null {
  if (!enabled) return null;

  const role = PRECHECK_ROLE_BY_SLUG[roleSlug];
  const base: PrecheckResult = role
    ? precheckCv(cvText, role)
    : { score: 0, hardGateFailures: [], matchedTerms: [], missingCoreTerms: [] };

  const certGate = certificationGate(cvText, roleSlug);
  if (certGate.gated && certGate.reason) {
    base.hardGateFailures = [certGate.reason, ...base.hardGateFailures];
  }

  // Nothing to surface for an unmapped role with a satisfied (or absent) gate.
  if (!role && base.hardGateFailures.length === 0) return null;
  return base;
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
