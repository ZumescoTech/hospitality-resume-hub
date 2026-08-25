/**
 * Virginia Mandaza — free-path regression.
 * Flattened from tests/fixtures/virginiaMandaza.ts (ResumeData used by PDF tests).
 */
import { describe, it, expect } from 'vitest';
import { scoreLocally } from '@/lib/localEngine';
import { virginiaMandaza } from '../fixtures/virginiaMandaza';
import type { ResumeData } from '@/types/resume';

export function flattenResumeToText(cv: ResumeData): string {
  const lines: string[] = [];
  const p = cv.personal;
  lines.push(p.fullName);
  if (p.title) lines.push(p.title);
  lines.push([p.email, p.phone, p.location].filter(Boolean).join(' | '));
  if (cv.summary) {
    lines.push('', 'SUMMARY', cv.summary);
  }
  if (cv.experience.length) {
    lines.push('', 'EXPERIENCE');
    for (const e of cv.experience) {
      const dates = [e.startDate, e.current ? 'Present' : e.endDate].filter(Boolean).join(' - ');
      lines.push(`${e.role} — ${e.venue}${e.location ? `, ${e.location}` : ''}  ${dates}`);
      if (e.description) lines.push(e.description);
    }
  }
  if (cv.education.length) {
    lines.push('', 'EDUCATION');
    for (const ed of cv.education) {
      lines.push(`${ed.degree} — ${ed.school}, ${ed.endDate || ed.startDate}`);
    }
  }
  if (cv.skills.length) {
    lines.push('', 'SKILLS', cv.skills.join(', '));
  }
  if (cv.certifications.length) {
    lines.push('', 'CERTIFICATIONS');
    for (const c of cv.certifications) {
      lines.push(`${c.name}${c.issuer ? ` — ${c.issuer}` : ''}${c.year ? ` (${c.year})` : ''}`);
    }
  }
  const h = cv.hospitality;
  if (h) {
    lines.push('', 'HOSPITALITY PROFILE');
    if (h.serviceStyles.length) lines.push(`Service: ${h.serviceStyles.join(', ')}`);
    if (h.posSystems.length) lines.push(`POS: ${h.posSystems.join(', ')}`);
    if (h.foodSafety) lines.push(`Food safety: ${h.foodSafety}`);
  }
  return lines.join('\n');
}

const MANDAZA_TEXT = flattenResumeToText(virginiaMandaza);

describe('Virginia Mandaza — free-tier localEngine', () => {
  const result = scoreLocally({
    cvText: MANDAZA_TEXT,
    roleSlug: 'cabin-steward-stewardess',
  });

  it('produces a complete, non-flat-50 profile', () => {
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
    const dims = [
      result.categories.keywordAlignment.score,
      result.categories.experienceDepth.score,
      result.categories.quantifiedAchievements.score,
      result.categories.atsParseability.score,
      result.categories.summaryQuality.score,
    ];
    expect(dims.every((s) => s === 50)).toBe(false);
    expect(result.categories.experienceDepth.score).not.toBe(50);
  });

  it('does not credit STCW/ENG1 on qualifications or cruiseReadiness for cabin steward', () => {
    expect(result.categories.qualifications.weight).toBe(0);
    expect(result.categories.cruiseReadiness.weight).toBe(0);
  });

  it('recognises Cunard / shipboard experience in cruiseReadiness (informational dimension)', () => {
    expect(result.categories.cruiseReadiness.score).toBeGreaterThan(20);
  });

  it('lands in a defensible band — not a Groq 50 and not a collapsed 0–20', () => {
    expect(result.overallScore).toBeGreaterThanOrEqual(40);
    expect(result.overallScore).toBeLessThan(85);
    expect(['Needs Work', 'Good']).toContain(result.tier);
  });

  it('flatten includes the signals the engine needs', () => {
    expect(MANDAZA_TEXT).toMatch(/Virginia Mandaza/);
    expect(MANDAZA_TEXT).toMatch(/Cunard/);
    expect(MANDAZA_TEXT).toMatch(/STCW/);
    expect(MANDAZA_TEXT).toMatch(/ENG1/);
    expect(MANDAZA_TEXT).toMatch(/SUMMARY/);
    expect(MANDAZA_TEXT.length).toBeGreaterThan(200);
  });
});
