// @vitest-environment node
/**
 * Whole-CV tailoring to a job ad: the AI rewrite may rephrase, but code
 * guarantees no invented numbers, no touched dates/employers/certs, and no
 * auto-added skills.
 */
import { describe, it, expect } from 'vitest';
import { sampleResume, type ResumeData } from '@/types/resume';
import {
  applyTailoring,
  buildTailorInput,
  buildTailorUserPrompt,
  guardNumbers,
  newSuggestedSkills,
  parseTailorResponse,
  type TailorCvResult,
} from '@/lib/tailor-cv';

const cv: ResumeData = {
  ...sampleResume,
  targetJobDescription: 'Head Sommelier, Cunard Queen Mary 2. WSET Level 3 required. Opera PMS and Micros POS experience preferred.',
};

describe('guardNumbers', () => {
  it('keeps numbers from the source and replaces invented ones with [X]', () => {
    expect(guardNumbers('Grew wine revenue by 38% across 450 covers', 'Grew wine revenue by 38% in 18 months')).toBe(
      'Grew wine revenue by 38% across [X] covers',
    );
  });

  it('leaves text without numbers unchanged', () => {
    expect(guardNumbers('Led Micros POS training', 'anything 12')).toBe('Led Micros POS training');
  });
});

describe('applyTailoring', () => {
  const first = cv.experience[0];
  const result: TailorCvResult = {
    summary: 'WSET Level 3 sommelier with 9+ years and 25 awards, ready for Cunard.',
    experience: [
      { id: first.id, bullets: ['• Curated a 420-bin list for 300 nightly guests', 'Trained commis'] },
      { id: 'made-up-id', bullets: ['Should be ignored'] },
    ],
    suggestedSkills: ['Opera PMS', 'Menu pairing'],
  };

  const out = applyTailoring(cv, result);

  it('rewrites the summary but guards invented numbers', () => {
    expect(out.summary).toContain('9+ years');
    expect(out.summary).toContain('[X] awards');
  });

  it('rewrites bullets, strips markers, and guards numbers per entry', () => {
    expect(out.experience[0].bullets).toEqual(['Curated a 420-bin list for [X] nightly guests', 'Trained commis']);
  });

  it('never touches roles, employers, dates, education, certifications or skills', () => {
    out.experience.forEach((e, i) => {
      expect(e.role).toBe(cv.experience[i].role);
      expect(e.venue).toBe(cv.experience[i].venue);
      expect(e.startDate).toBe(cv.experience[i].startDate);
      expect(e.endDate).toBe(cv.experience[i].endDate);
    });
    expect(out.education).toEqual(cv.education);
    expect(out.certifications).toEqual(cv.certifications);
    expect(out.skills).toEqual(cv.skills);
    expect(out.experience).toHaveLength(cv.experience.length);
  });

  it('keeps an entry unchanged when the AI returns no bullets for it', () => {
    expect(out.experience[1]).toEqual(cv.experience[1]);
  });

  it('keeps the original summary when the AI returns an empty one', () => {
    expect(applyTailoring(cv, { ...result, summary: '  ' }).summary).toBe(cv.summary);
  });
});

describe('newSuggestedSkills', () => {
  it('drops skills the user already lists (case-insensitive) and duplicates', () => {
    const r: TailorCvResult = { summary: '', experience: [], suggestedSkills: ['Opera PMS', 'menu pairing', 'Opera PMS', ' '] };
    expect(newSuggestedSkills(cv, r)).toEqual(['Opera PMS']);
  });
});

describe('parseTailorResponse', () => {
  it('accepts fenced JSON', () => {
    const r = parseTailorResponse('```json\n{"summary":"S","experience":[{"id":"a","bullets":["b"]}],"suggestedSkills":[]}\n```');
    expect(r.summary).toBe('S');
  });

  it('rejects malformed output', () => {
    expect(() => parseTailorResponse('not json')).toThrow();
    expect(() => parseTailorResponse('{"experience":[]}')).toThrow();
  });
});

describe('prompt input', () => {
  it('sends existing bullets and the job ad, keyed by entry id', () => {
    const input = buildTailorInput(cv);
    const prompt = buildTailorUserPrompt(input);
    expect(prompt).toContain(cv.experience[0].id);
    expect(prompt).toContain('Cunard Queen Mary 2');
    expect(input.experience[0].bullets.length).toBeGreaterThan(0);
  });
});
