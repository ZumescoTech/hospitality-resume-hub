/**
 * PremiumNoir — Dark luxury template for cruise line applicants.
 *
 * Layout: single-column on #0f172a (deep navy-black) background.
 * Header: name in white 28px; job title in #a78bfa; photo 72px circle top-right.
 * Sections: #7c3aed uppercase headings; body text #e2e8f0; muted #94a3b8.
 *
 * ⚠ ATS note: dark backgrounds are stripped by most ATS parsers.
 * Pair with ATS-safe PDF export for applications to large employers.
 *
 * Custom colours apply to browser preview only.
 * PDF export uses ResumePDF.tsx with fixed styles.
 */

import { ResumeData } from '@/types/resume';
import { TemplateColours } from '@/lib/template-colours';
import { dateRange } from '../utils';
import { CvSection } from '@/lib/cv-templates/CvSection';
import { CvEntry } from '@/lib/cv-templates/CvEntry';
import { PremiumPhotoPlaceholder } from './PremiumPhotoPlaceholder';
import { hasExperience, hasEducation, hasSkills, hasCertifications, filledLanguages } from '@/lib/cv-utils';

export function PremiumNoirTemplate({ data, colours }: { data: ResumeData; colours?: TemplateColours }) {
  const C = {
    bg:      colours?.background ?? '#ffffff',
    name:    '#1a1a1a',
    title:   colours?.accent     ?? '#0d6b5e',
    heading: colours?.primary    ?? '#0d6b5e',
    body:    colours?.text       ?? '#1a1a1a',
    muted:   '#4a4a4a',
    divider: '#e2e8f0',
  };

  function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2
        style={{
          fontSize:      '8.5pt',
          fontWeight:    700,
          color:         C.heading,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          margin:        '18pt 0 6pt',
          lineHeight:    1.2,
          borderBottom:  `1px solid ${C.divider}`,
          paddingBottom:  4,
        }}
      >
        {children}
      </h2>
    );
  }

  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const entryTokens = {
    titleColor: C.body,
    metaColor:  C.muted,
    bodyColor:  C.body,
    metaItalic: false,
    datesRight: true,
  };

  const filled = filledLanguages(hospitality);
  const langs = filled.length > 0 ? filled.map((l) => `${l.name} (${l.level})`).join(', ') : null;

  const photoPos = personal.photoPosition ?? 'top-right';
  const photo = (
    <PremiumPhotoPlaceholder
      src={personal.photo}
      size={72}
      shape="circle"
      border={`2px solid ${C.heading}`}
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
      <header style={{ marginBottom: 8 }}>
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
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: C.name, margin: 0, lineHeight: 1.15 }}>
              {personal.fullName || 'Your Name'}
            </h1>
            {personal.title && (
              <p style={{ fontSize: '13px', color: C.title, margin: '6px 0 0', fontWeight: 500 }}>
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
        empty={!hasExperience(experience)}
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
        empty={!hasSkills(skills)}
        renderHeading={() => <SectionHeading>Skills</SectionHeading>}
      >
        <p style={{ fontSize: '10pt', color: C.body, lineHeight: 1.6, margin: 0 }}>
          {skills.join(' · ')}
        </p>
      </CvSection>

      <CvSection
        empty={!hasEducation(education)}
        renderHeading={() => <SectionHeading>Education</SectionHeading>}
      >
        {education.map((e) => (
          <div key={e.id} style={{ marginBottom: 8 }}>
            <p style={{ fontWeight: 700, color: C.body, margin: 0, lineHeight: 1.3 }}>
              {[e.degree, e.field].filter(Boolean).join(', ')}
            </p>
            <p style={{ fontSize: '9.5pt', color: C.muted, margin: '2px 0 0', lineHeight: 1.3 }}>
              {e.school}{e.startDate || e.endDate ? ` · ${dateRange(e.startDate, e.endDate)}` : ''}
            </p>
          </div>
        ))}
      </CvSection>

      <CvSection
        empty={!hasCertifications(certifications)}
        renderHeading={() => <SectionHeading>Certifications</SectionHeading>}
      >
        {certifications.map((c) => (
          <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, marginBottom: 5 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 700, color: C.body }}>{c.name}</span>
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
