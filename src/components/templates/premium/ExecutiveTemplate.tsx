/**
 * Executive — Crisp white single-column template for ship's management roles.
 *
 * Layout: single-column, white background.
 * Header: name in #1e293b; job title in #7c3aed; 60×75px rectangular photo top-right.
 * Sections: left 3px solid #7c3aed accent stripe on each section heading.
 */

import { ResumeData } from '@/types/resume';
import { dateRange } from '../utils';
import { CvSection } from '@/lib/cv-templates/CvSection';
import { CvEntry } from '@/lib/cv-templates/CvEntry';
import { PremiumPhotoPlaceholder } from './PremiumPhotoPlaceholder';

const C = {
  bg:      '#ffffff',
  name:    '#1e293b',
  title:   '#7c3aed',
  heading: '#1e293b',
  body:    '#334155',
  muted:   '#64748b',
  accent:  '#7c3aed',
  divider: '#e2e8f0',
} as const;

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize:      '10pt',
        fontWeight:    700,
        color:         C.heading,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        margin:        '16pt 0 6pt',
        lineHeight:    1.2,
        paddingLeft:   10,
        borderLeft:    `3px solid ${C.accent}`,
      }}
    >
      {children}
    </h2>
  );
}

export function ExecutiveTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const entryTokens = {
    titleColor: C.name,
    metaColor:  C.muted,
    bodyColor:  C.body,
    metaItalic: false,
    datesRight: true,
  };

  const langs = hospitality.languages.length > 0
    ? hospitality.languages.map((l) => `${l.name} (${l.level})`).join(', ')
    : null;

  const photoPos = personal.photoPosition ?? 'top-right';
  const photo = (
    <PremiumPhotoPlaceholder
      src={personal.photo}
      size={60}
      shape="rect"
      border={`1px solid ${C.divider}`}
    />
  );

  return (
    <div
      style={{
        background: C.bg,
        color:      C.body,
        fontSize:   '10pt',
        lineHeight: 1.55,
        padding:    '52px 60px',
        minHeight:  1123,
        boxSizing:  'border-box',
      }}
    >
      {/* ── Header ── */}
      <header style={{ marginBottom: 4, borderBottom: `1px solid ${C.divider}`, paddingBottom: 18 }}>
        {photoPos === 'centre' && (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>{photo}</div>
        )}
        <div style={{
          display: 'flex',
          flexDirection: photoPos === 'top-left' ? 'row-reverse' : 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 20,
          textAlign: photoPos === 'centre' ? 'center' : 'left',
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: '26px', fontWeight: 700, color: C.name, margin: 0, lineHeight: 1.15 }}>
              {personal.fullName || 'Your Name'}
            </h1>
            {personal.title && (
              <p style={{ fontSize: '12px', color: C.title, margin: '6px 0 0', fontWeight: 600, letterSpacing: '0.04em' }}>
                {personal.title}
              </p>
            )}
            <p style={{ fontSize: '9pt', color: C.muted, margin: '8px 0 0', lineHeight: 1.4 }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join(' · ')}
            </p>
            {personal.links && personal.links.length > 0 && (
              <p style={{ fontSize: '9pt', color: C.muted, margin: '2px 0 0', lineHeight: 1.4 }}>
                {personal.links.map((l) => l.url).join(' · ')}
              </p>
            )}
          </div>
          {photoPos !== 'centre' && photo}
        </div>
      </header>

      <CvSection
        empty={!summary}
        renderHeading={() => <SectionHeading>Profile</SectionHeading>}
      >
        <p style={{ fontSize: '10pt', color: C.body, margin: 0, lineHeight: 1.55 }}>{summary}</p>
      </CvSection>

      <CvSection
        empty={experience.length === 0}
        renderHeading={() => <SectionHeading>Experience</SectionHeading>}
      >
        {experience.map((e) => (
          <CvEntry
            key={e.id}
            title={e.role}
            meta={[e.venue, e.location].filter(Boolean).join(', ')}
            dates={dateRange(e.startDate, e.endDate, e.current)}
            description={e.bullets ?? e.description}
            tokens={entryTokens}
            className="mb-4"
          />
        ))}
      </CvSection>

      <CvSection
        empty={skills.length === 0}
        renderHeading={() => <SectionHeading>Skills</SectionHeading>}
      >
        <p style={{ fontSize: '10pt', color: C.body, lineHeight: 1.6, margin: 0 }}>
          {skills.join(' · ')}
        </p>
      </CvSection>

      <CvSection
        empty={education.length === 0}
        renderHeading={() => <SectionHeading>Education</SectionHeading>}
      >
        {education.map((e) => (
          <div key={e.id} style={{ marginBottom: 8 }}>
            <p style={{ fontWeight: 700, color: C.name, margin: 0, lineHeight: 1.3 }}>
              {[e.degree, e.field].filter(Boolean).join(', ')}
            </p>
            <p style={{ fontSize: '9.5pt', color: C.muted, margin: '2px 0 0', lineHeight: 1.3 }}>
              {e.school}{e.startDate || e.endDate ? ` · ${dateRange(e.startDate, e.endDate)}` : ''}
            </p>
          </div>
        ))}
      </CvSection>

      <CvSection
        empty={certifications.length === 0}
        renderHeading={() => <SectionHeading>Certifications</SectionHeading>}
      >
        {certifications.map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: C.name }}>{c.name}</span>
              {c.issuer && <span style={{ color: C.muted }}> — {c.issuer}</span>}
            </div>
            <span style={{ fontSize: '9pt', color: C.muted, whiteSpace: 'nowrap', flexShrink: 0 }}>
              {c.expiry || (c.year ? `Obtained ${c.year}` : 'No expiry')}
            </span>
          </div>
        ))}
      </CvSection>

      {langs && (
        <CvSection
          empty={false}
          renderHeading={() => <SectionHeading>Languages</SectionHeading>}
        >
          <p style={{ fontSize: '10pt', color: C.body, margin: 0, lineHeight: 1.55 }}>{langs}</p>
        </CvSection>
      )}
    </div>
  );
}
