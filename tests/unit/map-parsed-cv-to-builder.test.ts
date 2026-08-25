/**
 * Phase 1 — builder mapping + hydration from the checker handoff.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { emptyResume, STORAGE_KEY } from '@/types/resume';
import { mapParsedCvToBuilderForm, hydrateBuilderFromHandoff } from '@/lib/map-parsed-cv-to-builder';
import { makeResume, makeScoreResult } from '../helpers/handoff-fixtures';
import { buildCheckerAudit } from '@/lib/checker-audit';
import type { CheckerHandoff } from '@/lib/cv-import-handoff';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      upsert: vi.fn().mockResolvedValue({ error: null }),
    }),
  },
}));

vi.mock('@/hooks/use-user', () => ({
  useUser: () => ({ user: null, loading: false }),
}));

function makeHandoff(): CheckerHandoff {
  const resume = makeResume({
    experience: [
      {
        id: '',
        role: 'Senior Waiter',
        venue: 'MSC Cruises',
        location: 'Mediterranean',
        startDate: '2021',
        endDate: '',
        current: true,
        description: '',
        bullets: ['Served 250 guests per sitting.', 'Trained 4 junior waiters.'],
      },
      {
        id: '',
        role: 'Waiter',
        venue: 'The Dorchester',
        location: 'London',
        startDate: '2018',
        endDate: '2021',
        description: '',
        bullets: ['Silver service for 120 covers.'],
      },
    ],
    certifications: [
      { id: '', name: 'STCW Basic Safety Training', issuer: 'SAMSA', year: '2023', expiry: '2028' },
      { id: '', name: 'WSET Level 1', issuer: 'WSET', year: '2020' },
    ],
  });
  return {
    schemaVersion: 1,
    createdAt: Date.now(),
    expiresAt: Date.now() + 30 * 60 * 1000,
    roleSlug: 'waiter-waitress',
    resume,
    audit: buildCheckerAudit(makeScoreResult()),
  };
}

describe('mapParsedCvToBuilderForm', () => {
  it('populates personal information, summary, skills and target-role-ready fields', () => {
    const mapped = mapParsedCvToBuilderForm(makeResume());
    expect(mapped.personal.fullName).toBe('Amina Ncube');
    expect(mapped.personal.email).toBe('amina.ncube@email.com');
    expect(mapped.personal.phone).toMatch(/82 000/);
    expect(mapped.summary).toMatch(/Fine-dining waiter/);
    expect(mapped.skills).toContain('Micros POS');
  });

  it('maps multiple experience records and keeps bullets attached, then joins them for the form', () => {
    const mapped = mapParsedCvToBuilderForm(makeHandoff().resume);
    expect(mapped.experience).toHaveLength(2);
    expect(mapped.experience[0].role).toBe('Senior Waiter');
    expect(mapped.experience[0].venue).toBe('MSC Cruises');
    expect(mapped.experience[0].description).toMatch(/250 guests/);
    expect(mapped.experience[0].description).toMatch(/Trained 4 junior waiters/);
    expect(mapped.experience[1].venue).toBe('The Dorchester');
    expect(mapped.experience[1].description).toMatch(/120 covers/);
  });

  it('maps education and certifications', () => {
    const mapped = mapParsedCvToBuilderForm(makeHandoff().resume);
    expect(mapped.education[0].school).toMatch(/Hotel School/);
    expect(mapped.certifications.map((c) => c.name).join(' ')).toMatch(/STCW/);
    expect(mapped.certifications.map((c) => c.name).join(' ')).toMatch(/WSET/);
  });

  it('normalises year-only dates to YYYY-MM and keeps current roles open-ended', () => {
    const mapped = mapParsedCvToBuilderForm(makeHandoff().resume);
    expect(mapped.experience[0].startDate).toBe('2021-01');
    expect(mapped.experience[0].endDate).toBe('');
    expect(mapped.experience[0].current).toBe(true);
    expect(mapped.experience[1].startDate).toBe('2018-01');
    expect(mapped.experience[1].endDate).toBe('2021-01');
  });

  it('assigns builder ids when missing', () => {
    const mapped = mapParsedCvToBuilderForm(makeHandoff().resume);
    expect(mapped.experience[0].id).toBeTruthy();
    expect(mapped.experience[1].id).toBeTruthy();
    expect(mapped.experience[0].id).not.toBe(mapped.experience[1].id);
    expect(mapped.education[0].id).toBeTruthy();
    expect(mapped.certifications[0].id).toBeTruthy();
  });
});

describe('hydrateBuilderFromHandoff', () => {
  it('populates every builder section and the target cruise role', () => {
    const next = hydrateBuilderFromHandoff(emptyResume, makeHandoff());
    expect(next.personal.fullName).toBe('Amina Ncube');
    expect(next.summary).toMatch(/Fine-dining waiter/);
    expect(next.experience).toHaveLength(2);
    expect(next.experience[0].description).toMatch(/250 guests/);
    expect(next.education).toHaveLength(1);
    expect(next.skills.length).toBeGreaterThan(0);
    expect(next.certifications.length).toBeGreaterThan(0);
    expect(next.targetRoleSlug).toBe('waiter-waitress');
    expect(next.checkerAudit?.overallScore).toBe(74);
  });

  it('preserves the current template id rather than clobbering it', () => {
    const current = { ...emptyResume, templateId: 'harbour' };
    const next = hydrateBuilderFromHandoff(current, makeHandoff());
    expect(next.templateId).toBe('harbour');
  });

  it('does not duplicate records when hydration runs twice', () => {
    const handoff = makeHandoff();
    const once = hydrateBuilderFromHandoff(emptyResume, handoff);
    const twice = hydrateBuilderFromHandoff(once, handoff);
    expect(twice.experience).toHaveLength(once.experience.length);
    expect(twice.education).toHaveLength(once.education.length);
    expect(twice.certifications).toHaveLength(once.certifications.length);
    expect(twice.skills).toEqual(once.skills);
  });

  it('leaves builder state unchanged when the handoff is null', () => {
    const current = makeResume({ personal: { ...emptyResume.personal, fullName: 'Keep Me' } });
    const next = hydrateBuilderFromHandoff(current, null);
    expect(next.personal.fullName).toBe('Keep Me');
    expect(next).toEqual(current);
  });
});

describe('anonymous persistence of a hydrated import', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    localStorage.clear();
  });

  it('writes the imported resume (including audit) to hospitality-resume-v1', async () => {
    const hydrated = hydrateBuilderFromHandoff(emptyResume, makeHandoff());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(hydrated));

    const { useResumeStore } = await import('@/lib/resume-store');
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    expect(result.current.data.personal.fullName).toBe('Amina Ncube');
    expect(result.current.data.experience).toHaveLength(2);
    expect(result.current.data.targetRoleSlug).toBe('waiter-waitress');
    expect(result.current.data.checkerAudit?.overallScore).toBe(74);
  });

  it('a normal blank builder session has no audit and no imported jobs', async () => {
    const { useResumeStore } = await import('@/lib/resume-store');
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));
    expect(result.current.data.personal.fullName).toBe('');
    expect(result.current.data.experience).toHaveLength(0);
    expect(result.current.data.checkerAudit).toBeUndefined();
  });
});

describe('signed-in persistence is not broken by the new optional audit field', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loads a previously saved resume that has no checkerAudit', async () => {
    const { useResumeStore } = await import('@/lib/resume-store');
    const { result } = renderHook(() => useResumeStore());
    await waitFor(() => expect(result.current.hydrated).toBe(true));

    act(() => {
      result.current.setData(makeResume());
    });

    expect(result.current.data.personal.fullName).toBe('Amina Ncube');
    expect(result.current.data.experience.length).toBeGreaterThan(0);
  });
});
