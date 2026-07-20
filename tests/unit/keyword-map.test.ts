/**
 * T4.1 — Hospitality keyword/synonym map expansion
 *
 * Tests verify that every new term and at least one synonym match correctly
 * via scoreKeywordAlignment, and that obvious negatives don't false-positive.
 */

import { describe, it, expect } from 'vitest';
import { scoreKeywordAlignment } from '@/lib/cvDeterministicChecks';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when scoreKeywordAlignment counts `kw` as matched. */
function matches(cvText: string, kw: string): boolean {
  const { matchedKeywords } = scoreKeywordAlignment(cvText, [kw]);
  return matchedKeywords.includes(kw);
}

// ─── POS systems ──────────────────────────────────────────────────────────────

describe('T4.1 — POS / till systems', () => {
  it('micros matches directly', () => expect(matches('Operated Micros POS daily', 'micros')).toBe(true));
  it('micros simphony matches as synonym of micros', () => expect(matches('Used Micros Simphony for orders', 'micros')).toBe(true));
  it('simphony matches as synonym of micros', () => expect(matches('Trained on Simphony system', 'micros')).toBe(true));
  it('lightspeed matches as synonym of micros', () => expect(matches('Ran Lightspeed POS', 'micros')).toBe(true));
  it('eazywine matches as synonym of micros', () => expect(matches('Used Eazywine for wine service', 'micros')).toBe(true));
  it('microscope does NOT match micros (false-positive guard)', () => expect(matches('Repaired microscope equipment', 'micros')).toBe(false));
});

// ─── Opera PMS / Fidelio ──────────────────────────────────────────────────────

describe('T4.1 — Opera PMS / Fidelio / property management', () => {
  it('opera pms matches directly', () => expect(matches('Proficient in Opera PMS for check-in', 'opera pms')).toBe(true));
  it('fidelio matches as synonym of opera pms', () => expect(matches('Trained on Fidelio at the Intercontinental', 'opera pms')).toBe(true));
  it('oracle opera matches as synonym of opera pms', () => expect(matches('System migration to Oracle Opera', 'opera pms')).toBe(true));
  it('property management system matches as synonym of opera pms', () => expect(matches('Experienced with property management system', 'opera pms')).toBe(true));
  it('random music opera does NOT match opera pms', () => expect(matches('Performed in a school opera production', 'opera pms')).toBe(false));
});

// ─── HACCP ────────────────────────────────────────────────────────────────────

describe('T4.1 — HACCP', () => {
  it('haccp matches directly', () => expect(matches('HACCP certified food safety', 'haccp')).toBe(true));
  it('haccp compliance matches as synonym', () => expect(matches('Maintained HACCP compliance in kitchen', 'haccp')).toBe(true));
  it('haccp level 2 matches as synonym', () => expect(matches('HACCP Level 2 in Food Hygiene', 'haccp')).toBe(true));
  it('hazard analysis critical control point matches as synonym', () => expect(matches('Certified in Hazard Analysis Critical Control Point', 'haccp')).toBe(true));
  it('random "hazard" word does NOT match haccp', () => expect(matches('Identified a fire hazard on site', 'haccp')).toBe(false));
});

// ─── STCW ─────────────────────────────────────────────────────────────────────

describe('T4.1 — STCW', () => {
  it('stcw matches directly', () => expect(matches('STCW Basic Safety Training valid to 2028', 'stcw')).toBe(true));
  it('basic safety training matches as synonym', () => expect(matches('Completed Basic Safety Training', 'stcw')).toBe(true));
  it('stcw basic safety training matches as synonym', () => expect(matches('STCW Basic Safety Training certificate', 'stcw')).toBe(true));
  it('stcw certified matches as synonym', () => expect(matches('STCW certified seafarer', 'stcw')).toBe(true));
  it('generic "safety" does NOT match stcw', () => expect(matches('Followed all safety procedures in kitchen', 'stcw')).toBe(false));
});

// ─── WSET ─────────────────────────────────────────────────────────────────────

describe('T4.1 — WSET (all levels)', () => {
  it('wset matches directly', () => expect(matches('WSET qualified wine professional', 'wset')).toBe(true));
  it('wset level 1 matches as synonym', () => expect(matches('Holds WSET Level 1 Award', 'wset')).toBe(true));
  it('wset level 2 matches as synonym', () => expect(matches('WSET Level 2 Award in Wines', 'wset')).toBe(true));
  it('wset level 3 matches as synonym', () => expect(matches('WSET Level 3 Pass with Merit', 'wset')).toBe(true));
  it('wset level 4 matches as synonym', () => expect(matches('WSET Level 4 Diploma holder', 'wset')).toBe(true));
  it('wset l2 abbreviation matches as synonym', () => expect(matches('WSET L2 certified', 'wset')).toBe(true));
  it('wine and spirit education trust matches as synonym', () => expect(matches('Wine and Spirit Education Trust certified', 'wset')).toBe(true));
  it('"west" does NOT match wset (false-positive guard)', () => expect(matches('Worked in the west wing of the hotel', 'wset')).toBe(false));
});

// ─── Cape Wine Academy ────────────────────────────────────────────────────────

describe('T4.1 — Cape Wine Academy', () => {
  it('cape wine academy matches directly', () => expect(matches('Cape Wine Academy Introduction to Wine', 'cape wine academy')).toBe(true));
  it('cwa matches as synonym', () => expect(matches('CWA certified wine professional', 'cape wine academy')).toBe(true));
  it('cape wine matches as synonym', () => expect(matches('Cape Wine Foundation certificate', 'cape wine academy')).toBe(true));
});

// ─── Cruise / seafarer contract terms ─────────────────────────────────────────

describe('T4.1 — Cruise contract / seafarer terms', () => {
  it('cruise ship matches directly', () => expect(matches('Worked aboard a cruise ship', 'cruise ship')).toBe(true));
  it('cruise contract matches as synonym', () => expect(matches('Completed a 9-month cruise contract', 'cruise ship')).toBe(true));
  it('shipboard matches as synonym', () => expect(matches('Shipboard experience with Royal Caribbean', 'cruise ship')).toBe(true));
  it('seafarer matches as synonym', () => expect(matches('Seafarer with valid ENG1', 'cruise ship')).toBe(true));
  it('onboard experience matches as synonym', () => expect(matches('Onboard experience across 3 voyages', 'cruise ship')).toBe(true));
  it('vessel experience matches as synonym', () => expect(matches('Vessel experience on Norwegian Joy', 'cruise ship')).toBe(true));
});

// ─── Guest satisfaction ───────────────────────────────────────────────────────

describe('T4.1 — Guest satisfaction metrics', () => {
  it('guest satisfaction matches directly', () => expect(matches('Maintained 96% guest satisfaction rating', 'guest satisfaction')).toBe(true));
  it('nps matches as synonym', () => expect(matches('Achieved top NPS score in team', 'guest satisfaction')).toBe(true));
  it('net promoter score matches as synonym', () => expect(matches('Improved Net Promoter Score by 12 points', 'guest satisfaction')).toBe(true));
  it('gss matches as synonym', () => expect(matches('GSS score 4.8/5.0 across voyages', 'guest satisfaction')).toBe(true));
  it('rebooking rate matches as synonym', () => expect(matches('Achieved 94% rebooking rate on contract', 'guest satisfaction')).toBe(true));
});

// ─── Wine service ─────────────────────────────────────────────────────────────

describe('T4.1 — Wine service terms', () => {
  it('wine service matches directly', () => expect(matches('Expert wine service in Michelin restaurant', 'wine service')).toBe(true));
  it('wine pairing matches as synonym', () => expect(matches('Advising guests on wine pairing with tasting menus', 'wine service')).toBe(true));
  it('cellar management matches as synonym', () => expect(matches('Responsible for cellar management', 'wine service')).toBe(true));
  it('wine list matches as synonym', () => expect(matches('Managed 300-label wine list', 'wine service')).toBe(true));
  it('wine tasting matches as synonym', () => expect(matches('Led wine tasting evenings for guests', 'wine service')).toBe(true));
});

// ─── Upselling expansions ─────────────────────────────────────────────────────

describe('T4.1 — Upselling synonyms', () => {
  it('beverage upselling matches as synonym', () => expect(matches('Specialised in beverage upselling techniques', 'upselling')).toBe(true));
  it('retail upselling matches as synonym', () => expect(matches('Drove retail upselling in spa', 'upselling')).toBe(true));
});
