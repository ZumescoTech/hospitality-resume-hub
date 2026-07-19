import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TEMPLATES } from '@/components/templates/registry';
import { ResumeRenderer } from '@/components/templates/ResumeRenderer';
import { emptyResume, type ResumeData } from '@/types/resume';

// ─── Edge-case fixtures ──────────────────────────────────────────────────────

/** Completely empty resume — all fields at their zero values */
const minimalResume: ResumeData = {
  ...emptyResume,
  personal: {
    fullName: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    photo: undefined,
    links: [],
  },
  templateId: 'vintage',
};

/** Unicode/accented name + non-Latin characters */
const unicodeResume: ResumeData = {
  ...emptyResume,
  personal: {
    fullName: 'José María García-López',
    title: 'Maître d\'hôtel & Sommelière',
    email: 'josé@crüise-línea.com',
    phone: '+34 612 345 678',
    location: 'Barcelona, España',
    photo: undefined,
    links: [{ label: 'LinkedIn', url: 'linkedin.com/in/jmgarcia' }],
  },
  summary: 'Expérience de 10 ans en hôtellerie de luxe. Spécialisée en service à la française et connaissance des vins du Rhône.',
  experience: [
    {
      id: 'e1',
      role: 'Maître d\'hôtel',
      venue: 'Château Léoville-Poyferré',
      location: 'Saint-Julien, Médoc',
      startDate: '2020-01',
      endDate: '',
      current: true,
      description: 'Gère une équipe de 12 serveurs pour 150 couverts/soir. Responsable de la cave (800 références).',
    },
  ],
  education: [
    { id: 'ed1', school: 'École Hôtelière de Lausanne', degree: 'Diplôme', field: 'Hôtellerie', startDate: '2015', endDate: '2018' },
  ],
  skills: ['Service à la française', 'Œnologie', 'HACCP', 'Système POS Micros'],
  certifications: [
    { id: 'c1', name: 'WSET Niveau 3 — Mention très bien', issuer: 'WSET', year: '2019' },
  ],
  hospitality: {
    serviceStyles: ['Fine dining', 'Service à la française'],
    posSystems: ['Micros', 'Lightspeed'],
    wineKnowledge: 'Sommelier',
    spiritsKnowledge: 'Advanced',
    languages: [
      { name: 'Français', level: 'Native' },
      { name: 'Español', level: 'Fluent' },
      { name: 'English', level: 'Fluent' },
    ],
    allergens: true,
    foodSafety: 'HACCP Niveau 2',
  },
  templateId: 'vintage',
};

/** Very long field values — stress test overflow handling */
const longTextResume: ResumeData = {
  ...emptyResume,
  personal: {
    fullName: 'Alexandra Victoria Penelope Montague-Worthington III',
    title: 'Executive Head Sommelier & Assistant Food and Beverage Director',
    email: 'alexandra.victoria.penelope.montague-worthington@luxury-cruise-hospitality-company.com',
    phone: '+44 20 7946 0123 ext. 4567',
    location: 'Kensington & Chelsea, Greater London, United Kingdom',
    photo: undefined,
    links: [
      { label: 'LinkedIn', url: 'linkedin.com/in/avpmontagueworthington' },
      { label: 'Portfolio', url: 'montaguewines.co.uk/portfolio' },
    ],
  },
  summary: 'A'.repeat(500) + ' — summary stress test with an extremely long paragraph that should not break the layout but instead wrap or truncate gracefully within the template rendering engine.',
  experience: [
    {
      id: 'e1',
      role: 'Executive Head Sommelier & Wine Programme Director (International Fleet)',
      venue: 'Royal Caribbean International — Symphony of the Seas, Wonder of the Seas, Icon of the Seas',
      location: 'Miami, FL / Global Itinerary',
      startDate: '2018-01',
      endDate: '',
      current: true,
      description: 'B'.repeat(300) + ' — long description stress test.',
      bullets: [
        'Managed an international wine programme spanning 47 restaurants across 3 vessels with a combined annual revenue exceeding $12.4M USD and a team of 34 dedicated wine professionals',
        'Achieved a 98.7% guest satisfaction score across all wine-related service touchpoints as measured by post-cruise surveys and onboard feedback systems',
        'C'.repeat(200) + ' — extremely long bullet point stress test',
      ],
    },
    {
      id: 'e2',
      role: 'Senior Sommelier',
      venue: 'The Ritz London',
      location: 'London',
      startDate: '2015-06',
      endDate: '2017-12',
      description: 'Standard role description.',
    },
  ],
  education: [
    { id: 'ed1', school: 'Wine & Spirit Education Trust', degree: 'WSET Diploma (Level 4)', field: 'Wines & Spirits', startDate: '2016', endDate: '2018' },
  ],
  skills: Array.from({ length: 20 }, (_, i) => `Skill ${i + 1} with a reasonably long name`),
  certifications: Array.from({ length: 8 }, (_, i) => ({
    id: `c${i}`,
    name: `Certification ${i + 1} with an extended name for testing`,
    issuer: `International Board of Certification ${i + 1}`,
    year: `${2018 + i}`,
  })),
  hospitality: {
    serviceStyles: ['Fine dining', 'Tasting menu', 'À la carte', 'Banquet', 'Cocktail service', 'Butler service'],
    posSystems: ['Micros', 'Simphony', 'Lightspeed', 'Toast', 'Eazywine'],
    wineKnowledge: 'Sommelier',
    spiritsKnowledge: 'Mixologist',
    languages: [
      { name: 'English', level: 'Native' },
      { name: 'French', level: 'Fluent' },
      { name: 'Italian', level: 'Conversational' },
      { name: 'Spanish', level: 'Basic' },
    ],
    allergens: true,
    foodSafety: 'Level 4 Advanced Food Safety & Hygiene Management',
  },
  templateId: 'vintage',
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Template rendering guards — all templates handle edge-case data', () => {
  const templateIds = TEMPLATES.map((t) => t.id);

  describe.each(templateIds)('template: %s', (templateId) => {
    it('renders with completely empty/minimal data (no crash)', () => {
      const data = { ...minimalResume, templateId };
      expect(() => render(<ResumeRenderer data={data} template={templateId} />)).not.toThrow();
    });

    it('renders with unicode/accented names and content', () => {
      const data = { ...unicodeResume, templateId };
      const { container } = render(<ResumeRenderer data={data} template={templateId} />);
      // Verify the accented name actually appears in the output
      expect(container.textContent).toContain('José María García-López');
    });

    it('renders with very long field values without throwing', () => {
      const data = { ...longTextResume, templateId };
      expect(() => render(<ResumeRenderer data={data} template={templateId} />)).not.toThrow();
    });

    it('renders with no photo, no summary, empty arrays', () => {
      const data: ResumeData = {
        ...emptyResume,
        personal: {
          fullName: 'Test User',
          title: 'Waiter',
          email: 'test@example.com',
          phone: '+1 555 0100',
          location: 'Miami',
          photo: undefined,
          links: [],
        },
        summary: '',
        experience: [],
        education: [],
        skills: [],
        certifications: [],
        templateId,
      };
      const { container } = render(<ResumeRenderer data={data} template={templateId} />);
      expect(container.textContent).toContain('Test User');
    });
  });
});
