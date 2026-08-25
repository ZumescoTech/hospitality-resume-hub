/**
 * Phase 1 — versioned checker → builder sessionStorage handoff.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { saveCvImport, consumeCvImport, clearCvImport } from '@/lib/cv-import-handoff';
import { makeResume, makeScoreResult } from '../helpers/handoff-fixtures';
import { buildCheckerAudit } from '@/lib/checker-audit';

const KEY = 'zumesco:cv-import';

function validInput(now = 1_700_000_000_000) {
  const resume = makeResume();
  const audit = buildCheckerAudit(makeScoreResult());
  return { resume, roleSlug: 'waiter-waitress' as const, audit, now };
}

describe('checker-to-builder handoff contract', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('serializes and deserializes without data loss', () => {
    const input = validInput();
    saveCvImport(input);
    const out = consumeCvImport();
    expect(out).not.toBeNull();
    expect(out!.schemaVersion).toBe(1);
    expect(out!.roleSlug).toBe('waiter-waitress');
    expect(out!.resume.personal.fullName).toBe(input.resume.personal.fullName);
    expect(out!.resume.personal.email).toBe(input.resume.personal.email);
    expect(out!.resume.summary).toBe(input.resume.summary);
    expect(out!.resume.experience).toHaveLength(2);
    expect(out!.resume.experience[0].bullets?.[0]).toMatch(/250 guests/);
    expect(out!.resume.education[0].school).toMatch(/Hotel School/);
    expect(out!.resume.skills).toContain('Micros POS');
    expect(out!.resume.certifications.map((c) => c.name).join(' ')).toMatch(/STCW/);
    expect(out!.audit.overallScore).toBe(74);
    expect(out!.audit.tier).toBe('Good');
    expect(out!.audit.categories.keywordAlignment.score).toBe(70);
    expect(out!.audit.topFixes[0]).toMatch(/Opera PMS/);
    expect(out!.audit.missingKeywords).toContain('Opera PMS');
    expect(out!.audit.matchedKeywords).toContain('waiter');
    expect(out!.audit.fixes.length).toBeGreaterThan(0);
  });

  it('round-trips hospitality fields and extracted source text, never a File', () => {
    const resume = makeResume({
      hospitality: {
        serviceStyles: ['Fine dining'],
        posSystems: ['Micros'],
        wineKnowledge: 'Intermediate',
        spiritsKnowledge: 'None',
        languages: [{ name: 'English', level: 'Native' }],
        allergens: true,
        foodSafety: 'HACCP Level 2',
      },
    });
    const sourceText = 'JAMES HOLLOWAY\nExperienced waiter CV text for enrichment that is over fifty characters.';
    saveCvImport({
      resume,
      roleSlug: 'waiter-waitress',
      audit: buildCheckerAudit(makeScoreResult()),
      sourceText,
    });
    const raw = sessionStorage.getItem(KEY);
    expect(raw).not.toMatch(/application\/pdf|arrayBuffer|\bFile\b/);
    const out = consumeCvImport();
    expect(out?.resume.hospitality.posSystems).toContain('Micros');
    expect(out?.resume.hospitality.wineKnowledge).toBe('Intermediate');
    expect(out?.resume.hospitality.languages[0]).toEqual({ name: 'English', level: 'Native' });
    expect(out?.resume.hospitality.foodSafety).toMatch(/HACCP/);
    expect(out?.sourceText).toBe(sourceText);
  });

  it('is consumed only once and a successful read removes the payload', () => {
    saveCvImport(validInput());
    expect(consumeCvImport()).not.toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(consumeCvImport()).toBeNull();
  });

  it('rejects expired payloads and removes them', () => {
    saveCvImport(validInput());
    vi.advanceTimersByTime(30 * 60 * 1000 + 1);
    expect(consumeCvImport()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('still returns a payload just before the 30-minute expiry', () => {
    saveCvImport(validInput());
    vi.advanceTimersByTime(30 * 60 * 1000 - 1_000);
    expect(consumeCvImport()?.resume.personal.fullName).toBe('Amina Ncube');
  });

  it('rejects invalid JSON and removes it', () => {
    sessionStorage.setItem(KEY, '{not-json');
    expect(consumeCvImport()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('rejects unsupported schema versions safely', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 99,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
        roleSlug: 'waiter-waitress',
        resume: makeResume(),
        audit: buildCheckerAudit(makeScoreResult()),
      }),
    );
    expect(consumeCvImport()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('rejects structurally invalid data safely', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        schemaVersion: 1,
        createdAt: Date.now(),
        expiresAt: Date.now() + 60_000,
      }),
    );
    expect(consumeCvImport()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('rejects legacy unversioned payloads without crashing', () => {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        data: makeResume(),
        savedAt: Date.now(),
        roleSlug: 'waiter-waitress',
      }),
    );
    expect(() => consumeCvImport()).not.toThrow();
    expect(consumeCvImport()).toBeNull();
    expect(sessionStorage.getItem(KEY)).toBeNull();
  });

  it('does not crash on storage failures', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveCvImport(validInput())).not.toThrow();
    spy.mockRestore();
  });

  it('never includes the original file object or binary content', () => {
    saveCvImport(validInput());
    const raw = sessionStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed).not.toHaveProperty('file');
    expect(JSON.stringify(parsed)).not.toMatch(/arrayBuffer|application\/pdf|File\b/);
    expect(parsed.resume).toBeDefined();
    expect(parsed.resume.personal.photo).toBeUndefined();
  });

  it('clearCvImport removes a stored payload', () => {
    saveCvImport(validInput());
    clearCvImport();
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(consumeCvImport()).toBeNull();
  });
});
