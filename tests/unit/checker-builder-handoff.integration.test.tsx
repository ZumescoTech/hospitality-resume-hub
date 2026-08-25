/**
 * Phase 1 — parse → score → handoff → hydrate → checklist, without a live browser.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCvLocally } from '@/lib/cvExtractDeterministic';
import { scoreLocally } from '@/lib/localEngine';
import { saveCvImport, consumeCvImport } from '@/lib/cv-import-handoff';
import { hydrateBuilderFromHandoff } from '@/lib/map-parsed-cv-to-builder';
import { buildCheckerAudit, evaluateChecklist } from '@/lib/checker-audit';
import { ImprovementChecklist } from '@/components/builder/ImprovementChecklist';
import { emptyResume } from '@/types/resume';

const CV = readFileSync(resolve(__dirname, '../fixtures/cvs/waiter-experienced.txt'), 'utf8');
const KEY = 'zumesco:cv-import';

describe('checker → builder handoff journey', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
    sessionStorage.clear();
  });

  it('imports structured CV content, role, and an actionable checklist without duplicating records', () => {
    const parsed = parseCvLocally(CV);
    const score = scoreLocally({ cvText: CV, roleSlug: 'waiter-waitress' });
    const audit = buildCheckerAudit(score);

    saveCvImport({ resume: parsed, roleSlug: 'waiter-waitress', audit });

    const handoff = consumeCvImport();
    expect(handoff).not.toBeNull();
    expect(handoff!.roleSlug).toBe('waiter-waitress');

    const first = hydrateBuilderFromHandoff(emptyResume, handoff);
    expect(first.personal.fullName).toMatch(/james holloway/i);
    expect(first.personal.email).toBe('james.holloway@email.com');
    expect(first.summary).toMatch(/fine-dining waiter/i);
    expect(first.experience.length).toBeGreaterThanOrEqual(3);
    expect(first.education.length).toBeGreaterThanOrEqual(1);
    expect(first.skills.length).toBeGreaterThanOrEqual(4);
    expect(first.certifications.some((c) => /STCW/i.test(c.name))).toBe(true);
    expect(first.targetRoleSlug).toBe('waiter-waitress');
    expect(first.checkerAudit?.overallScore).toBe(score.overallScore);

    render(
      <ImprovementChecklist resume={first} onOpenSection={() => {}} onAuditChange={() => {}} />,
    );
    expect(screen.getByRole('region', { name: /improvement checklist/i })).toBeTruthy();

    const before = evaluateChecklist(first.checkerAudit!, first);
    const withOpera = {
      ...first,
      skills: [...first.skills, 'Opera PMS'],
    };
    const after = evaluateChecklist(first.checkerAudit!, withOpera);
    expect(after.completed + after.total).toBeGreaterThan(0);
    if (first.checkerAudit!.fixes.some((f) => /opera pms/i.test(`${f.title} ${f.explanation} ${f.keyword ?? ''}`))) {
      expect(after.completed).toBeGreaterThanOrEqual(before.completed);
    }

    const second = hydrateBuilderFromHandoff(first, handoff);
    expect(second.experience).toHaveLength(first.experience.length);
    expect(second.education).toHaveLength(first.education.length);
    expect(second.certifications).toHaveLength(first.certifications.length);

    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(consumeCvImport()).toBeNull();
  });
});
