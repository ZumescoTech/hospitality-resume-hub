import { emptyResume, type ResumeData } from '@/types/resume';
import type { CvScoreResult } from '@/lib/cruiseCvRubric';

export function makeResume(overrides: Partial<ResumeData> = {}): ResumeData {
  const { personal: personalOverride, ...rest } = overrides;
  return {
    ...emptyResume,
    summary:
      rest.summary ??
      'Fine-dining waiter with 6 years in 5-star hotels and two cruise contracts.',
    experience:
      rest.experience ??
      [
        {
          id: 'e1',
          role: 'Senior Waiter',
          venue: 'MSC Cruises',
          location: 'Mediterranean',
          startDate: '2021',
          endDate: '',
          current: true,
          description: '',
          bullets: ['Served 250 guests per sitting and held an NPS of 91.'],
        },
        {
          id: 'e2',
          role: 'Waiter',
          venue: 'The Mount Nelson',
          location: 'Cape Town',
          startDate: '2018',
          endDate: '2021',
          description: '',
          bullets: ['Delivered silver service to 80 covers nightly.'],
        },
      ],
    education:
      rest.education ??
      [
        {
          id: 'ed1',
          school: 'Cape Town Hotel School',
          degree: 'Diploma in Hospitality Management',
          field: 'Hospitality',
          startDate: '2016',
          endDate: '2018',
        },
      ],
    skills: rest.skills ?? ['Silver service', 'Micros POS', 'Wine service'],
    certifications:
      rest.certifications ??
      [
        { id: 'c1', name: 'STCW Basic Safety Training', issuer: 'SAMSA', year: '2023' },
        { id: 'c2', name: 'HACCP Level 2', issuer: 'Highfield', year: '2022' },
      ],
    templateId: rest.templateId ?? 'vintage',
    hospitality: rest.hospitality ?? emptyResume.hospitality,
    ...rest,
    personal: {
      ...emptyResume.personal,
      fullName: 'Amina Ncube',
      title: 'Waiter',
      email: 'amina.ncube@email.com',
      phone: '+27 82 000 1111',
      location: 'Cape Town',
      links: [{ label: 'LinkedIn', url: 'https://linkedin.com/in/aminancube' }],
      ...personalOverride,
    },
  };
}

export function makeScoreResult(overrides: Partial<CvScoreResult> = {}): CvScoreResult {
  const categories = {
    keywordAlignment: { score: 70, weight: 0.3, feedback: 'Local' },
    experienceDepth: { score: 80, weight: 0.3, feedback: 'Local' },
    quantifiedAchievements: { score: 75, weight: 0.25, feedback: 'Local' },
    qualifications: { score: 0, weight: 0, feedback: 'Local' },
    cruiseReadiness: { score: 0, weight: 0, feedback: 'Local' },
    atsParseability: { score: 90, weight: 0.1, feedback: 'Local' },
    summaryQuality: { score: 70, weight: 0.05, feedback: 'Local' },
    ...overrides.categories,
  };
  return {
    overallScore: 74,
    tier: 'Good',
    categories,
    topFixes: ['Add Opera PMS to your systems/skills section', 'Quantify wine club sign-ups'],
    matchedKeywords: ['waiter', 'cruise ship', 'silver service'],
    missingKeywords: ['Opera PMS', 'STCW'],
    deterministicFeedback: [
      'Add Opera PMS to your systems/skills section — it is the standard property management system on most major cruise lines',
      'Add your STCW Basic Safety Training certificate with its validity date — this is a mandatory compliance requirement for cruise roles',
    ],
    confidence: { level: 'High', reasons: ['Clean text'] },
    ...overrides,
  };
}
