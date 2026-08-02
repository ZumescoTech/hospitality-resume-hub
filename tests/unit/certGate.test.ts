/**
 * Role-conditional certification gate.
 *
 * Contract:
 *   - Sommelier / Wine Waiter: gate satisfied by EITHER WSET or CMS (Court of
 *     Master Sommeliers). Either cert alone passes; missing both flags a gate.
 *   - Every other role: no certification gate at all. STCW / ENG1 / HACCP never
 *     gate a role and never move the score.
 */
import { describe, it, expect } from 'vitest';
import { certificationGate, SOMMELIER_SLUG } from '@/lib/precheck/certGate';
import { resolvePrecheck } from '@/lib/precheck/wiring';

const SOMM_BASE =
  'Wine Waiter with 6 years in fine dining. Managed a 400-label cellar, led food and wine pairings, grew beverage revenue 22%. 2016 - 2023.';

describe('certificationGate — Sommelier / Wine Waiter', () => {
  it('WSET only → gate passes', () => {
    const cv = `${SOMM_BASE}\nWSET Level 3 Award in Wines (2019).`;
    const r = certificationGate(cv, SOMMELIER_SLUG);
    expect(r.gated).toBe(false);
    expect(r.reason).toBeNull();
  });

  it('CMS only, no WSET → gate passes (either cert bypasses)', () => {
    const cv = `${SOMM_BASE}\nCourt of Master Sommeliers — Certified Sommelier (2021).`;
    const r = certificationGate(cv, SOMMELIER_SLUG);
    expect(r.gated).toBe(false);
    expect(r.reason).toBeNull();
  });

  it('bare "CMS" acronym also passes', () => {
    const cv = `${SOMM_BASE}\nCMS Introductory certification (2020).`;
    expect(certificationGate(cv, SOMMELIER_SLUG).gated).toBe(false);
  });

  it('neither WSET nor CMS → gate fails/flags', () => {
    const r = certificationGate(SOMM_BASE, SOMMELIER_SLUG);
    expect(r.gated).toBe(true);
    expect(r.reason).toMatch(/WSET/);
    expect(r.reason).toMatch(/Court of Master Sommeliers|CMS/);
  });

  it('the job title "sommelier" alone does NOT satisfy the cert gate', () => {
    const cv = 'Sommelier at a 5-star restaurant. Poured wine and advised guests. 2018 - 2023.';
    expect(certificationGate(cv, SOMMELIER_SLUG).gated).toBe(true);
  });
});

describe('certificationGate — every other role has no cert gate', () => {
  const otherRoles = [
    'cabin-steward-stewardess',
    'waiter-waitress',
    'bartender-bar-waiter',
    'youth-staff',
    'commis-chef-cook',
  ];

  it('a non-sommelier CV missing STCW/ENG1/HACCP is never gated', () => {
    const cv =
      'Cabin Steward, 6 years servicing staterooms and suites, turndown service, linen and amenities. No STCW, no ENG1, no HACCP listed. 2017 - 2023.';
    for (const slug of otherRoles) {
      const r = certificationGate(cv, slug);
      expect(r.gated).toBe(false);
      expect(r.reason).toBeNull();
    }
  });

  it('having WSET does not matter for a non-sommelier role either (no cert gate at all)', () => {
    const cv = 'Bartender with WSET Level 2. Mixed drinks and served guests. 2019 - 2023.';
    expect(certificationGate(cv, 'bartender-bar-waiter').gated).toBe(false);
  });
});

// ─── Wired through resolvePrecheck (the live short-circuit + UI surface) ───────

describe('resolvePrecheck folds the sommelier cert gate into hardGateFailures', () => {
  it('sommelier missing both certs → non-null result carrying the gate failure', () => {
    const r = resolvePrecheck(SOMM_BASE, SOMMELIER_SLUG, true);
    expect(r).not.toBeNull();
    expect(r!.hardGateFailures.length).toBeGreaterThan(0);
    expect(r!.hardGateFailures.join(' ')).toMatch(/WSET/);
  });

  it('sommelier with WSET → no cert failure (null, since sommelier has no term-bank)', () => {
    const cv = `${SOMM_BASE}\nWSET Level 3.`;
    expect(resolvePrecheck(cv, SOMMELIER_SLUG, true)).toBeNull();
  });

  it('respects the enabled flag', () => {
    expect(resolvePrecheck(SOMM_BASE, SOMMELIER_SLUG, false)).toBeNull();
  });

  it('a mapped non-sommelier role never gains a cert gate', () => {
    const cv =
      'Cabin steward. Cleaned and serviced staterooms, turndown service, changed linen and made beds. 2018 - 2023.';
    const r = resolvePrecheck(cv, 'cabin-steward-stewardess', true);
    expect(r).not.toBeNull();
    // No STCW/ENG1 in the text, but certs are no longer a gate for this role.
    expect(r!.hardGateFailures.join(' ')).not.toMatch(/STCW|ENG1|HACCP/);
  });
});
