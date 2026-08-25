/**
 * Every slug in cruise-roles.json must produce a complete CvScoreResult from
 * localEngine — not just the two term-bank roles the precheck covers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreLocally } from '@/lib/localEngine';
import type { CategoryKey } from '@/lib/cruiseCvRubric';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const CATEGORY_KEYS: CategoryKey[] = [
  'keywordAlignment',
  'experienceDepth',
  'quantifiedAchievements',
  'qualifications',
  'cruiseReadiness',
  'atsParseability',
  'summaryQuality',
];

const TIERS = new Set(['Strong', 'Good', 'Needs Work', 'Major Gaps']);

const cv = readFileSync(resolve(__dirname, '../fixtures/cvs/waiter-experienced.txt'), 'utf8');

const roles = (cruiseRolesRaw as { roles: Array<{ slug: string; role: string }> }).roles;

describe('localEngine covers every cruise role', () => {
  it('cruise-roles.json has at least the known slugs', () => {
    expect(roles.map((r) => r.slug)).toEqual(expect.arrayContaining([
      'waiter-waitress',
      'night-steward',
      'cabin-steward-stewardess',
      'sommelier-wine-waiter',
      'youth-staff',
    ]));
  });

  for (const role of roles) {
    it(`${role.slug} → complete CvScoreResult`, () => {
      const result = scoreLocally({ cvText: cv, roleSlug: role.slug });
      expect(result).not.toBeNull();
      expect(typeof result.overallScore).toBe('number');
      expect(Number.isNaN(result.overallScore)).toBe(false);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(TIERS.has(result.tier)).toBe(true);
      for (const key of CATEGORY_KEYS) {
        expect(result.categories[key]).toBeDefined();
        expect(typeof result.categories[key].score).toBe('number');
        expect(typeof result.categories[key].weight).toBe('number');
        expect(typeof result.categories[key].feedback).toBe('string');
      }
      expect(Array.isArray(result.matchedKeywords)).toBe(true);
      expect(Array.isArray(result.missingKeywords)).toBe(true);
      expect(Array.isArray(result.topFixes)).toBe(true);
      expect(result.confidence).toBeDefined();
    });
  }

  it('unknown slug throws', () => {
    expect(() => scoreLocally({ cvText: cv, roleSlug: 'stateroom-attendant' })).toThrow(
      /Unknown role/,
    );
  });
});
