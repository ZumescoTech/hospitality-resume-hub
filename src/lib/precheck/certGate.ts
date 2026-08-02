// certGate.ts
// Role-conditional certification gate.
//
// The ONLY role that has a certification gate is Sommelier / Wine Waiter. For
// that role the gate is satisfied by EITHER a WSET qualification OR a Court of
// Master Sommeliers (CMS) qualification — either one alone passes the gate.
// Missing BOTH surfaces as a clear gate/flag.
//
// EVERY other role has no certification gate at all: STCW / ENG1 / HACCP and
// friends are informational only — they never gate a role and never move the
// score. (The deterministic pre-check score is keyword-coverage only, so certs
// never contributed to the number; this module just makes the gating rule
// explicit and role-scoped.)

/** Slug (cruise-roles.json) of the only role with a certification gate. */
export const SOMMELIER_SLUG = 'sommelier-wine-waiter';

export interface CertGateResult {
  /** True when the role's certification requirement is unmet — a blocker/flag. */
  gated: boolean;
  /** Human-readable reason when gated, else null. */
  reason: string | null;
}

const PASS: CertGateResult = { gated: false, reason: null };

// WSET (Wine & Spirit Education Trust), any level.
const WSET_RE = /\bwset\b|wine\s*&?\s*(?:and\s+)?spirit(?:s)?\s+education\s+trust/i;

// Court of Master Sommeliers (CMS): the body, its acronym, or any of its
// certification levels ("Master Sommelier", "Advanced/Certified/Introductory
// Sommelier" issued by the CMS). Deliberately does NOT match the bare word
// "sommelier" (that is the job title, not a certification).
const CMS_RE =
  /\bcms\b|court\s+of\s+master\s+sommeliers?|(?:master|advanced|certified|introductory)\s+sommelier/i;

/**
 * Evaluate the certification gate for a role.
 * @param cvText   Plain extracted CV text.
 * @param roleSlug App role slug (cruise-roles.json).
 * @returns        `{ gated: false }` for every role except Sommelier / Wine
 *                 Waiter; for that role, gated unless WSET OR CMS is present.
 */
export function certificationGate(cvText: string, roleSlug: string): CertGateResult {
  if (roleSlug !== SOMMELIER_SLUG) return PASS;

  const hasWset = WSET_RE.test(cvText);
  const hasCms = CMS_RE.test(cvText);
  if (hasWset || hasCms) return PASS;

  return {
    gated: true,
    reason:
      'No wine certification found — the Sommelier / Wine Waiter role requires ' +
      'either WSET (any level) or a Court of Master Sommeliers (CMS) qualification. ' +
      'Add whichever you hold (or note it as "in progress").',
  };
}
