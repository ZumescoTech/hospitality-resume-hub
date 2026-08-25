/**
 * Phase 1 — checker advice becomes a builder improvement checklist.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyResume } from '@/types/resume';
import { makeResume, makeScoreResult } from '../helpers/handoff-fixtures';
import { buildCheckerAudit, evaluateFix, evaluateChecklist } from '@/lib/checker-audit';
import { ImprovementChecklist } from '@/components/builder/ImprovementChecklist';

describe('buildCheckerAudit', () => {
  it('creates at most five actionable fixes with title, explanation, priority and section', () => {
    const audit = buildCheckerAudit(
      makeScoreResult({
        missingKeywords: ['Opera PMS', 'STCW', 'Micros', 'HACCP', 'WSET', 'upselling'],
        deterministicFeedback: [
          'Add a professional summary at the top tailored to the Waiter position',
          'Add numbers to your bullet points — guests served per shift',
          'Add your email address and phone number clearly at the top of your CV',
        ],
      }),
    );
    expect(audit.fixes.length).toBeGreaterThan(0);
    expect(audit.fixes.length).toBeLessThanOrEqual(5);
    for (const fix of audit.fixes) {
      expect(fix.title.length).toBeGreaterThan(0);
      expect(fix.explanation.length).toBeGreaterThan(0);
      expect(['high', 'medium', 'low']).toContain(fix.priority);
      expect(['personal', 'experience', 'education', 'skills', 'certifications', 'hospitality']).toContain(
        fix.targetSection,
      );
    }
  });
});

describe('evaluateFix — automatic completion from resume state', () => {
  it('completes a missing-summary fix when a summary is added, and reopens it when removed', () => {
    const fix = {
      id: 'missing-summary',
      title: 'Add a professional summary',
      explanation: 'Lead with your speciality and years of experience',
      priority: 'high' as const,
      targetSection: 'personal' as const,
      kind: 'missing-summary' as const,
    };
    expect(evaluateFix(fix, { ...makeResume(), summary: '' })).toBe(false);
    expect(evaluateFix(fix, makeResume({ summary: 'WSET sommelier with 8 years in luxury hotels.' }))).toBe(true);
    expect(evaluateFix(fix, { ...makeResume(), summary: '' })).toBe(false);
  });

  it('completes a certification fix when STCW / WSET / HACCP / ENG1 is present', () => {
    const stcw = {
      id: 'cert-stcw',
      title: 'Add STCW',
      explanation: 'Cruise roles expect Basic Safety Training',
      priority: 'high' as const,
      targetSection: 'certifications' as const,
      kind: 'missing-cert' as const,
      certName: 'STCW',
    };
    const without = makeResume({ certifications: [] });
    expect(evaluateFix(stcw, without)).toBe(false);
    expect(
      evaluateFix(stcw, makeResume({
        certifications: [{ id: 'c1', name: 'STCW Basic Safety Training', issuer: '', year: '2023' }],
      })),
    ).toBe(true);
  });

  it('completes a quantified-achievement fix when a numbered bullet is added', () => {
    const fix = {
      id: 'missing-quantified',
      title: 'Quantify achievements',
      explanation: 'Add numbers to bullets',
      priority: 'high' as const,
      targetSection: 'experience' as const,
      kind: 'missing-quantified' as const,
    };
    const blank = makeResume({
      experience: [{
        id: 'e1', role: 'Waiter', venue: 'Hotel', location: '', startDate: '2020', endDate: '',
        description: 'Served guests every evening.', bullets: ['Served guests every evening.'],
      }],
    });
    expect(evaluateFix(fix, blank)).toBe(false);
    const numbered = makeResume({
      experience: [{
        id: 'e1', role: 'Waiter', venue: 'Hotel', location: '', startDate: '2020', endDate: '',
        description: 'Served 120 guests per sitting.', bullets: ['Served 120 guests per sitting.'],
      }],
    });
    expect(evaluateFix(fix, numbered)).toBe(true);
  });

  it('completes a contact fix when email and phone are present', () => {
    const fix = {
      id: 'missing-contact',
      title: 'Add contact details',
      explanation: 'Email and phone at the top',
      priority: 'high' as const,
      targetSection: 'personal' as const,
      kind: 'missing-contact' as const,
    };
    const missing = makeResume({
      personal: { ...emptyResume.personal, fullName: 'Amina', email: '', phone: '' },
    });
    expect(evaluateFix(fix, missing)).toBe(false);
    expect(evaluateFix(fix, makeResume())).toBe(true);
  });

  it('manual completion is ignored for auto-evaluable fixes and used only for generic ones', () => {
    const auto = {
      id: 'missing-summary',
      title: 'Add a professional summary',
      explanation: 'Lead with your speciality',
      priority: 'high' as const,
      targetSection: 'personal' as const,
      kind: 'missing-summary' as const,
      completedManually: true,
    };
    expect(evaluateFix(auto, { ...makeResume(), summary: '' })).toBe(false);

    const generic = {
      id: 'generic-1',
      title: 'Re-export a cleaner file',
      explanation: 'Text extraction looked messy',
      priority: 'low' as const,
      targetSection: 'personal' as const,
      kind: 'generic' as const,
      completedManually: true,
    };
    expect(evaluateFix(generic, makeResume())).toBe(true);
    expect(evaluateFix({ ...generic, completedManually: false }, makeResume())).toBe(false);
  });
});

describe('ImprovementChecklist UI', () => {
  it('does not render for a normal builder session without audit data', () => {
    const { container } = render(
      <ImprovementChecklist resume={emptyResume} onOpenSection={() => {}} onAuditChange={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('region', { name: /improvement checklist/i })).toBeNull();
  });

  it('appears when audit data exists, shows completed/total, and caps at five fixes', () => {
    const resume = makeResume({ summary: '' });
    resume.checkerAudit = buildCheckerAudit(
      makeScoreResult({
        missingKeywords: ['Opera PMS', 'STCW', 'Micros', 'HACCP', 'WSET', 'upselling'],
        deterministicFeedback: [
          'Add a professional summary at the top tailored to the Waiter position',
          'Add numbers to your bullet points — guests served per shift',
        ],
      }),
    );
    render(
      <ImprovementChecklist resume={resume} onOpenSection={() => {}} onAuditChange={() => {}} />,
    );
    expect(screen.getByRole('region', { name: /improvement checklist/i })).toBeTruthy();
    expect(screen.getByText(/\d+ of \d+ complete/i)).toBeTruthy();
    const items = screen.getAllByRole('listitem');
    expect(items.length).toBeGreaterThan(0);
    expect(items.length).toBeLessThanOrEqual(5);
  });

  it('routes missing summary, certification, quantified and contact fixes to the right sections', async () => {
    const user = userEvent.setup();
    const opened: string[] = [];
    const audit = buildCheckerAudit(
      makeScoreResult({
        missingKeywords: ['STCW'],
        deterministicFeedback: [
          'Add a professional summary at the top tailored to the Waiter position',
          'Add your STCW Basic Safety Training certificate with its validity date — this is a mandatory compliance requirement for cruise roles',
          'Add numbers to your bullet points — guests served per shift, team size, revenue figures, or satisfaction scores make your achievements concrete',
          'Add your email address and phone number clearly at the top of your CV',
        ],
      }),
    );
    const resume = makeResume({
      summary: '',
      personal: { ...emptyResume.personal, fullName: 'Amina', email: '', phone: '' },
      certifications: [],
      experience: [{
        id: 'e1', role: 'Waiter', venue: 'Hotel', location: '', startDate: '2020', endDate: '',
        description: 'Helped guests.',
      }],
      checkerAudit: audit,
    });
    render(
      <ImprovementChecklist
        resume={resume}
        onOpenSection={(id) => { opened.push(id); }}
        onAuditChange={() => {}}
      />,
    );

    await user.click(screen.getByRole('button', { name: /summary/i }));
    await user.click(screen.getByRole('button', { name: /STCW/i }));
    await user.click(screen.getByRole('button', { name: /quantif|numbers|bullet/i }));
    await user.click(screen.getByRole('button', { name: /email|phone|contact/i }));

    expect(opened).toContain('personal');
    expect(opened).toContain('certifications');
    expect(opened).toContain('experience');
  });

  it('updates the completed count when the resume gains a summary', () => {
    const audit = buildCheckerAudit(
      makeScoreResult({
        missingKeywords: [],
        matchedKeywords: ['waiter'],
        deterministicFeedback: [
          'Add a professional summary at the top tailored to the Waiter position',
        ],
        topFixes: ['Add a professional summary'],
      }),
    );
    const without = makeResume({ summary: '', checkerAudit: audit });
    const { rerender } = render(
      <ImprovementChecklist resume={without} onOpenSection={() => {}} onAuditChange={() => {}} />,
    );
    const before = screen.getByText(/\d+ of \d+ complete/i).textContent;
    const withSummary = makeResume({
      summary: 'Fine-dining waiter with 6 years in 5-star hotels.',
      checkerAudit: audit,
    });
    rerender(
      <ImprovementChecklist resume={withSummary} onOpenSection={() => {}} onAuditChange={() => {}} />,
    );
    const after = screen.getByText(/\d+ of \d+ complete/i).textContent;
    expect(after).not.toBe(before);
    const evaluated = evaluateChecklist(audit, withSummary);
    expect(evaluated.completed).toBeGreaterThan(0);
  });
});
