import { describe, it, expect } from 'vitest';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';
import type { CruiseRolesData } from '@/lib/cruiseCvRubric';

const rolesData = cruiseRolesRaw as CruiseRolesData;

const SOMMELIER_SLUG = 'sommelier-wine-waiter';

// ─── R-1 T1: role exists in the list ─────────────────────────────────────────

describe('R-1: Sommelier / Wine Waiter role', () => {
  const role = rolesData.roles.find((r) => r.slug === SOMMELIER_SLUG);

  it('T1: sommelier-wine-waiter slug exists in cruise-roles.json', () => {
    expect(role).toBeDefined();
  });

  it('T1: role label is "Sommelier / Wine Waiter"', () => {
    expect(role?.role).toBe('Sommelier / Wine Waiter');
  });

  // ─── R-1 T2: keyword profile is wine-specific, not bartender ─────────────

  it('T2: keywords include core sommelier terms — sommelier', () => {
    expect(role?.keywords).toContain('sommelier');
  });

  it('T2: keywords include wine pairing', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase().includes('wine pairing') || k.toLowerCase().includes('food and wine'))).toBe(true);
  });

  it('T2: keywords include WSET', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toUpperCase().includes('WSET'))).toBe(true);
  });

  it('T2: keywords include cellar management or cellar', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase().includes('cellar'))).toBe(true);
  });

  it('T2: keywords include upselling or beverage revenue', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase().includes('upselling') || k.toLowerCase().includes('beverage revenue'))).toBe(true);
  });

  it('T2: keywords include tasting', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase().includes('tasting'))).toBe(true);
  });

  it('T2: keywords include Cape Wine Academy or wine certification', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase().includes('cape wine') || k.toLowerCase().includes('academy'))).toBe(true);
  });

  // ─── R-1 T3: must NOT be a copy of the Bartender role ───────────────────

  it('T3: keywords do NOT include mixology (wrong role)', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase() === 'mixology')).toBe(false);
  });

  it('T3: keywords do NOT include cocktails as a primary term (wrong role focus)', () => {
    // "cocktails" may appear in context of wine service but must not be a lead keyword
    // We check it is not in the first 10 keywords (the primary signal keywords)
    const primaryKws = (role?.keywords ?? []).slice(0, 10).map((k) => k.toLowerCase());
    expect(primaryKws).not.toContain('cocktails');
  });

  it('T3: keywords do NOT include mixologist (wrong role)', () => {
    const kws = role?.keywords ?? [];
    expect(kws.some((k) => k.toLowerCase() === 'mixologist')).toBe(false);
  });

  // ─── R-1 structural checks ───────────────────────────────────────────────

  it('has a non-empty summary describing wine/sommelier work', () => {
    expect(role?.summary.toLowerCase()).toMatch(/wine|sommelier/);
  });

  it('has at least 5 experience requirements', () => {
    expect((role?.experienceRequirements ?? []).length).toBeGreaterThanOrEqual(5);
  });

  it('has at least 3 certifications listed', () => {
    expect((role?.certifications ?? []).length).toBeGreaterThanOrEqual(3);
  });

  it('has at least 15 keywords', () => {
    expect((role?.keywords ?? []).length).toBeGreaterThanOrEqual(15);
  });

  // ─── R-1 T4: role is distinct from bartender ─────────────────────────────

  it('T4: sommelier role is separate from bartender-bar-waiter role', () => {
    const bartender = rolesData.roles.find((r) => r.slug === 'bartender-bar-waiter');
    expect(bartender).toBeDefined();
    expect(role?.keywords).not.toEqual(bartender?.keywords);
  });
});
