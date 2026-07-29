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
  it('strong housekeeping CV scores well but is gated on missing cruise certs', () => {
    const r = report('housekeeping-supervisor (strong, cabin proxy)', loadCv('housekeeping-supervisor.txt'), 'cabin-steward');
    // Calibration snapshot (v1.1.0 bank + synonym/spelling folding): ~58.
    expect(r.score).toBeGreaterThan(45);
    expect(r.score).toBeLessThan(70);
    // Real domain content is matched
    expect(r.matchedTerms).toEqual(
      expect.arrayContaining(['turndown service', 'housekeeping', 'linen', 'room attendant']),
    );
    // No STCW/ENG1 anywhere → both hard gates fire
    expect(r.hardGateFailures.join(' ')).toMatch(/STCW/);
    expect(r.hardGateFailures.join(' ')).toMatch(/ENG1/);
    // WHMIS (ski-resort-only cert) must NOT be gated
    expect(r.hardGateFailures.join(' ')).not.toMatch(/WHMIS/);
  });

  it('strong youth CV scores well and is gated only on the certs it lacks', () => {
    const r = report('youth-counselor (strong)', loadCv('youth-counselor.txt'), 'staff-youth');
    expect(r.score).toBeGreaterThanOrEqual(80); // calibration snapshot: ~91
    expect(r.matchedTerms).toEqual(
      expect.arrayContaining(['child safeguarding', 'age appropriate activities', 'arts and crafts']),
    );
    // Has Level 3 + First Aid/CPR, so those gates should be quiet; lacks BLS & the
    // explicit Child Safeguarding *certificate* wording is present → not gated.
    expect(r.hardGateFailures.join(' ')).toMatch(/BLS/);
    expect(r.hardGateFailures.join(' ')).not.toMatch(/Level 3/);
  });

  it('thin/generic CV scores low and is clearly separated from a strong one', () => {
    const strong = precheckCv(loadCv('housekeeping-supervisor.txt'), 'cabin-steward', FIXED_YEAR);
    const thin = report('cabin-steward-thin (weak/generic)', loadCv('cabin-steward-thin.txt'), 'cabin-steward');
    expect(thin.score).toBeLessThan(strong.score);
    expect(thin.score).toBeLessThanOrEqual(20); // harsh where a human would flag it (~14)
    expect(thin.hardGateFailures.join(' ')).toMatch(/STCW/);
  });

  it('experience estimator reads explicit phrases and date spans', () => {
    expect(estimateCvExperienceYears('7 years in 4- and 5-star hotels', FIXED_YEAR)).toBe(7);
    expect(estimateCvExperienceYears('Room Attendant 2017 – 2020', FIXED_YEAR)).toBe(3);
    expect(estimateCvExperienceYears('Leader 2022 – Present', FIXED_YEAR)).toBe(4);
    expect(estimateCvExperienceYears('no dates or durations here')).toBeNull();
  });
});
