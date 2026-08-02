import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { precheckCv, estimateCvExperienceYears } from '@/lib/precheck/prechecker';
import type { RoleType } from '@/lib/precheck/types';

const FIXED_YEAR = 2026; // deterministic "present" for the experience gate

function loadCv(name: string): string {
  return readFileSync(resolve(__dirname, '../fixtures/cvs', name), 'utf8');
}

function report(title: string, cv: string, role: RoleType) {
  const r = precheckCv(cv, role, FIXED_YEAR);
  const lines = [
    `\n──────── ${title}  [role: ${role}] ────────`,
    `SCORE: ${r.score}/100`,
    `HARD GATES (${r.hardGateFailures.length}):`,
    ...(r.hardGateFailures.length ? r.hardGateFailures.map((f) => `  ✗ ${f}`) : ['  (none)']),
    `MATCHED (${r.matchedTerms.length}): ${r.matchedTerms.slice(0, 24).join(', ')}${r.matchedTerms.length > 24 ? ' …' : ''}`,
    `MISSING CORE (${r.missingCoreTerms.length}): ${r.missingCoreTerms.join(', ') || '(none)'}`,
  ];
  // eslint-disable-next-line no-console
  console.log(lines.join('\n'));
  return r;
}

describe('precheckCv — sample CV sanity checks', () => {
  it('strong housekeeping CV scores well and is NOT gated on certs (certs are informational now)', () => {
    const r = report('housekeeping-supervisor (strong, cabin proxy)', loadCv('housekeeping-supervisor.txt'), 'cabin-steward');
    // Calibration snapshot (v1.1.0 bank + synonym/spelling folding): ~58.
    expect(r.score).toBeGreaterThan(45);
    expect(r.score).toBeLessThan(70);
    // Real domain content is matched
    expect(r.matchedTerms).toEqual(
      expect.arrayContaining(['turndown service', 'housekeeping', 'linen', 'room attendant']),
    );
    // Certification gating was removed for every non-sommelier role: missing
    // STCW/ENG1/HACCP must NOT gate this CV (and there is no experience shortfall).
    expect(r.hardGateFailures.join(' ')).not.toMatch(/STCW|ENG1|HACCP|WHMIS/);
    expect(r.hardGateFailures).toHaveLength(0);
  });

  it('strong youth CV scores well and is NOT gated on certs', () => {
    const r = report('youth-counselor (strong)', loadCv('youth-counselor.txt'), 'staff-youth');
    expect(r.score).toBeGreaterThanOrEqual(80); // calibration snapshot: ~91
    expect(r.matchedTerms).toEqual(
      expect.arrayContaining(['child safeguarding', 'age appropriate activities', 'arts and crafts']),
    );
    // No certification gate for the youth role either.
    expect(r.hardGateFailures.join(' ')).not.toMatch(/BLS|Level 3|Safeguarding|Childcare/);
    expect(r.hardGateFailures).toHaveLength(0);
  });

  it('thin/generic CV scores low and is clearly separated from a strong one', () => {
    const strong = precheckCv(loadCv('housekeeping-supervisor.txt'), 'cabin-steward', FIXED_YEAR);
    const thin = report('cabin-steward-thin (weak/generic)', loadCv('cabin-steward-thin.txt'), 'cabin-steward');
    expect(thin.score).toBeLessThan(strong.score);
    expect(thin.score).toBeLessThanOrEqual(20); // harsh where a human would flag it (~14)
    // The low SCORE — not a cert gate — is what separates a weak CV now.
    expect(thin.hardGateFailures.join(' ')).not.toMatch(/STCW|ENG1|HACCP/);
  });

  it('experience estimator reads explicit phrases and date spans', () => {
    expect(estimateCvExperienceYears('7 years in 4- and 5-star hotels', FIXED_YEAR)).toBe(7);
    expect(estimateCvExperienceYears('Room Attendant 2017 – 2020', FIXED_YEAR)).toBe(3);
    expect(estimateCvExperienceYears('Leader 2022 – Present', FIXED_YEAR)).toBe(4);
    expect(estimateCvExperienceYears('no dates or durations here')).toBeNull();
  });
});
