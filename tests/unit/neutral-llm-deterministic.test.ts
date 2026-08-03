/**
 * buildNeutralLlmResponse — deterministic degraded-path scoring.
 *
 * Regression guard for the fallback-flooring bug: the neutral response used to
 * hardcode 50 for experienceDepth / qualifications / cruiseReadiness /
 * summaryQuality regardless of CV content. Every dimension must now be derived
 * from deterministic signals + the CV text.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildNeutralLlmResponse } from '@/lib/cvFeedback';
import { computeCvScore } from '@/lib/cruiseCvRubric';
import { runDeterministicChecks, scoreKeywordAlignment } from '@/lib/cvDeterministicChecks';
import type { DeterministicSignals } from '@/lib/cvDeterministicChecks';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const SOMM = 'sommelier-wine-waiter';

function signals(overrides?: Partial<DeterministicSignals>): DeterministicSignals {
  return {
    hasContactInfo: true,
    hasSummarySection: true,
    headingsFound: ['Experience', 'Education', 'Skills'],
    wordCount: 400,
    quantifiedBulletCount: 3,
    suspectGarbledText: false,
    ...overrides,
  };
}

// ─── No more flat 50s ─────────────────────────────────────────────────────────

describe('buildNeutralLlmResponse — no hardcoded 50s', () => {
  it('the four previously-floored dimensions vary with CV content, not a constant 50', () => {
    const strong = buildNeutralLlmResponse(
      0.6,
      signals(),
      'Senior Sommelier\nSummary\n8 years senior sommelier on luxury cruise ships. WSET Level 3.\nExperience\nSommelier — Cunard 2016 - Present',
      SOMM,
    );
    const weak = buildNeutralLlmResponse(
      0.05,
      signals({ wordCount: 90, quantifiedBulletCount: 0 }),
      'Summary\nHardworking team player, passionate and motivated.',
      'waiter-waitress',
    );
    // None of these should be the old flat 50, and the strong CV must beat the weak one.
    expect(strong.experienceDepth.score).not.toBe(50);
    expect(strong.experienceDepth.score).toBeGreaterThan(weak.experienceDepth.score);
    expect(strong.summaryQuality.score).toBeGreaterThan(weak.summaryQuality.score);
    expect(strong.cruiseReadiness.score).toBeGreaterThan(weak.cruiseReadiness.score);
  });
});

// ─── experienceDepth from parsed years ────────────────────────────────────────

describe('experienceDepth ← years parsed from the CV', () => {
  it('more parsed years yields a higher experienceDepth (relevance held equal)', () => {
    const junior = buildNeutralLlmResponse(0.5, signals(), 'Waiter\nExperience\nWaiter 2022 - 2023', 'waiter-waitress');
    const senior = buildNeutralLlmResponse(0.5, signals(), 'Waiter\nExperience\nWaiter 2010 - Present', 'waiter-waitress');
    expect(senior.experienceDepth.score).toBeGreaterThan(junior.experienceDepth.score);
  });
});

// ─── summaryQuality: generic vs targeted ──────────────────────────────────────

describe('summaryQuality ← targeted vs generic summary', () => {
  it('a targeted summary (years + specialty) beats generic filler', () => {
    const targeted = buildNeutralLlmResponse(0.4, signals(), 'Summary\n6 years as a cruise cabin steward servicing luxury staterooms.', 'cabin-steward-stewardess');
    const generic = buildNeutralLlmResponse(0.4, signals(), 'Summary\nHardworking, passionate team player and fast learner.', 'cabin-steward-stewardess');
    expect(targeted.summaryQuality.score).toBeGreaterThan(generic.summaryQuality.score);
    expect(generic.summaryQuality.score).toBeLessThan(40);
  });
});

// ─── cruiseReadiness from EXPERIENCE, never certificate presence ───────────────

describe('cruiseReadiness ← cruise experience, not certificates', () => {
  it('genuine cruise/shipboard experience raises the score', () => {
    const cruise = buildNeutralLlmResponse(0.4, signals(), 'Experience\nWaiter aboard MSC cruise ships, 3 shipboard contracts on the vessel.', 'waiter-waitress');
    const land = buildNeutralLlmResponse(0.4, signals(), 'Experience\nWaiter at a city restaurant.', 'waiter-waitress');
    expect(cruise.cruiseReadiness.score).toBeGreaterThan(land.cruiseReadiness.score);
  });

  it('certificate presence alone (STCW/ENG1/C1D) does NOT raise cruiseReadiness', () => {
    const certsOnly = buildNeutralLlmResponse(0.4, signals(), 'Certifications\nSTCW Basic Safety Training. ENG1 Medical. C1/D US Visa.', 'waiter-waitress');
    const nothing = buildNeutralLlmResponse(0.4, signals(), 'Experience\nWaiter at a city restaurant.', 'waiter-waitress');
    expect(certsOnly.cruiseReadiness.score).toBe(nothing.cruiseReadiness.score);
  });
});

// ─── qualifications respects the role-conditional cert rule ────────────────────

describe('qualifications ← role-relevant credentials (role-conditional cert rule)', () => {
  it('sommelier: WSET/CMS presence lifts qualifications', () => {
    const withWset = buildNeutralLlmResponse(0.4, signals(), 'Certifications\nWSET Level 3 Award in Wines.', SOMM);
    const withCms = buildNeutralLlmResponse(0.4, signals(), 'Certifications\nCourt of Master Sommeliers — Certified Sommelier.', SOMM);
    const none = buildNeutralLlmResponse(0.4, signals(), 'Experience\nWine waiter.', SOMM);
    expect(withWset.qualifications.score).toBeGreaterThan(none.qualifications.score);
    expect(withCms.qualifications.score).toBeGreaterThan(none.qualifications.score);
  });

  it('non-sommelier: compliance certs (STCW/ENG1/HACCP/WSET) do NOT lift qualifications', () => {
    const certs = buildNeutralLlmResponse(0.4, signals(), 'Certifications\nSTCW, ENG1, HACCP Level 2, WSET Level 1.', 'waiter-waitress');
    const none = buildNeutralLlmResponse(0.4, signals(), 'Experience\nWaiter.', 'waiter-waitress');
    expect(certs.qualifications.score).toBe(none.qualifications.score);
  });
});

// ─── Weak fixture: degraded-path overall pinned below 40 ──────────────────────

describe('weak-generic fixture — degraded-path overall is genuinely low', () => {
  it('scores below 40 (pinned snapshot: 16 / Major Gaps)', () => {
    const cv = readFileSync(resolve(__dirname, '../fixtures/cvs/weak-generic.txt'), 'utf8');
    const role = (cruiseRolesRaw as { roles: Array<{ slug: string; keywords: string[] }> }).roles
      .find((r) => r.slug === 'waiter-waitress')!;
    const sig = runDeterministicChecks(cv);
    const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(cv, role.keywords);
    const neutral = buildNeutralLlmResponse(matchRatio, sig, cv, 'waiter-waitress');
    const result = computeCvScore(neutral, matchedKeywords, missingKeywords, 'waiter-waitress');

    expect(result.overallScore).toBeLessThan(40); // the contract
    expect(result.overallScore).toBe(16);          // pinned snapshot
    expect(result.tier).toBe('Major Gaps');
  });
});
