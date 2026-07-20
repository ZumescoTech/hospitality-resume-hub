/**
 * Winelands — Burgundy single-column template for wine estates & tasting rooms.
 *
 * Headings/name: Caladea 700 (Cambria-metric serif). Body: Arial system stack.
 * Layout: full-width header (name block + rounded photo) over a 3px burgundy
 * rule, then single-column sections — Profile, Core Competencies (3-col grid),
 * Work Experience (inline one-line headers + hanging en-dash bullets),
 * Qualifications (education + certifications), Skills (expertise + languages).
 *
 * Experience entries are rendered locally rather than via CvEntry: the inline
 * mixed-style header (bold title · italic company · muted dates) and hanging
 * en-dash bullets don't map onto CvEntry's tokens, and extending CvEntry for
 * this one layout would risk the other templates' byte-identical output.
 *
 * Custom colours apply to browser preview only.
 * PDF export uses ResumePDF.tsx with fixed styles.
 */

import { ResumeData } from '@/types/resume';
import { TemplateColours } from '@/lib/template-colours';
import { dateRange } from '../utils';
import { CvSection } from '@/lib/cv-templates/CvSection';
import { PremiumPhotoPlaceholder } from './PremiumPhotoPlaceholder';
import { normalizeBullets } from '@/lib/cv-templates/normalizeBullets';
import { hasExperience, hasEducation, hasSkills, hasCertifications, filledLanguages } from '@/lib/cv-utils';

const HEADING_STACK = "'Caladea', Cambria, Georgia, serif";
const BODY_STACK = 'Arial, Helvetica, sans-serif';

export function WinelandsTemplate({ data, colours }: { data: ResumeData; colours?: TemplateColours }) {
  const C = {
    bg:        colours?.background ?? '#ffffff',
    accent:    colours?.primary    ?? '#6b2737',
    ink:       colours?.text       ?? '#1a1a1a',
    secondary: '#333333',
    dates:     '#999999',
    hairline:  '#d9d9d9',
  };

  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  /** Section heading — Caladea 700, 13pt, uppercase, burgundy. `rule` draws the
   *  1px hairline used only under Core Competencies and Work Experience. */
  function SectionHeading({ children, rule }: { children: React.ReactNode; rule?: boolean }) {
    return (
      <>
        <h2
          style={{
            fontFamily:    HEADING_STACK,
            fontWeight:    700,
            fontSize:      '13pt',
            color:         C.accent,
            textTransform: 'uppercase',
            letterSpacing: 'normal',
            lineHeight:    1.2,
            margin:        '22px 0 10px',
          }}
        >
          {children}
        </h2>
        {rule && <div style={{ borderTop: `1px solid ${C.hairline}`, margin: '14px 0' }} />}
      </>
    );
  }

  // Expertise label/value pairs — same construction the other templates use.
  const expertise: { label: string; value: string }[] = [];
  if (hospitality.wineKnowledge && hospitality.wineKnowledge !== 'None') expertise.push({ label: 'Wine', value: hospitality.wineKnowledge });
  if (hospitality.spiritsKnowledge && hospitality.spiritsKnowledge !== 'None') expertise.push({ label: 'Spirits', value: hospitality.spiritsKnowledge });
  if (hospitality.serviceStyles.length > 0) expertise.push({ label: 'Service', value: hospitality.serviceStyles.join(', ') });
  if (hospitality.posSystems.length > 0) expertise.push({ label: 'POS', value: hospitality.posSystems.join(', ') });
  if (hospitality.foodSafety) expertise.push({ label: 'Food Safety', value: hospitality.foodSafety });

  const filled = filledLanguages(hospitality);
  const skillRows = [...expertise];
  if (filled.length > 0) {
    skillRows.push({ label: 'Languages', value: filled.map((l) => `${l.name} (${l.level})`).join(', ') });
  }

  return (
    <div
      style={{
        background: C.bg,
        color:      C.ink,
        fontFamily: BODY_STACK,
        fontSize:   '10pt',
        lineHeight: 1.4,
        padding:    '57px 70px',
        minHeight:  1123,
        boxSizing:  'border-box',
      }}
    >
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: HEADING_STACK, fontWeight: 700, fontSize: '23pt', color: C.accent, margin: 0, lineHeight: 1.15 }}>
            {personal.fullName || 'Your Name'}
          </h1>
          {personal.title && (
            <p style={{ fontStyle: 'italic', fontSize: '11pt', color: C.secondary, margin: '6px 0 0', lineHeight: 1.3 }}>
              {personal.title}
            </p>
          )}
          {(personal.location || personal.phone) && (
            <p style={{ fontSize: '10pt', color: C.secondary, margin: '8px 0 0', lineHeight: 1.4, whiteSpace: 'pre' }}>
              {[personal.location, personal.phone].filter(Boolean).join('   ')}
            </p>
          )}
          {personal.email && (
            <p style={{ fontSize: '10pt', color: C.secondary, margin: '2px 0 0', lineHeight: 1.4 }}>
              {personal.email}
            </p>
          )}
        </div>
        {personal.photo && (
          <PremiumPhotoPlaceholder src={personal.photo} size={95} shape="rounded" />
        )}
      </header>

      <div style={{ borderTop: `3px solid ${C.accent}`, margin: '16px 0 20px' }} />

      {/* ── Profile ── */}
      <CvSection empty={!summary} renderHeading={() => <SectionHeading>Profile</SectionHeading>}>
        <p style={{ fontSize: '10pt', color: C.ink, margin: 0, lineHeight: 1.4 }}>{summary}</p>
      </CvSection>

      {/* ── Core Competencies ── */}
      <CvSection empty={!hasSkills(skills)} renderHeading={() => <SectionHeading rule>Core Competencies</SectionHeading>}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', columnGap: 16, rowGap: 12 }}>
          {skills.map((s) => (
            <div key={s} style={{ fontSize: '10pt', color: C.ink, lineHeight: 1.35 }}>
              <span style={{ color: C.ink }}>{'✓'}{'  '}</span>{s}
            </div>
          ))}
        </div>
      </CvSection>

      {/* ── Work Experience ── */}
      <CvSection empty={!hasExperience(experience)} renderHeading={() => <SectionHeading rule>Work Experience</SectionHeading>}>
        {experience.map((e) => {
          const company = [e.venue, e.location].filter(Boolean).join(', ');
          const dates = dateRange(e.startDate, e.endDate, e.current);
          const bullets = normalizeBullets(e.bullets ?? e.description);
          return (
            <div key={e.id} style={{ marginBottom: 16 }}>
              <p style={{ fontSize: '10.5pt', margin: 0, lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: C.ink }}>{e.role}</span>
                {company && (
                  <>
                    <span style={{ color: C.ink }}> · </span>
                    <span style={{ fontStyle: 'italic', color: C.secondary }}>{company}</span>
                  </>
                )}
                {dates && <span style={{ fontSize: '10pt', color: C.dates }}>{'  '}{dates}</span>}
              </p>
              {bullets.length > 0 && (
                <ul style={{ margin: '6px 0 0', padding: 0, listStyle: 'none' }}>
                  {bullets.map((b, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: '10pt',
                        color: C.ink,
                        lineHeight: 1.4,
                        paddingLeft: 18,
                        textIndent: -18,
                        marginBottom: 6,
                      }}
                    >
                      <span aria-hidden="true">{'–'}{'  '}</span>{b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </CvSection>

      {/* ── Qualifications ── */}
      <CvSection
        empty={!hasEducation(education) && !hasCertifications(certifications)}
        renderHeading={() => <SectionHeading>Qualifications</SectionHeading>}
      >
        {education.map((e) => {
          const qualification = [e.degree, e.field].filter(Boolean).join(', ');
          const date = dateRange(e.startDate, e.endDate);
          return (
            <p key={e.id} style={{ fontSize: '10pt', margin: '0 0 6px', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: C.accent }}>{e.school}</span>
              {qualification && <span style={{ color: C.ink }}>{' '}{qualification}</span>}
              {date && <span style={{ color: C.ink }}>{' · '}{date}</span>}
            </p>
          );
        })}
        {certifications.map((c) => {
          const date = c.expiry || c.year;
          return (
            <p key={c.id} style={{ fontSize: '10pt', margin: '0 0 6px', lineHeight: 1.4 }}>
              <span style={{ fontWeight: 700, color: C.accent }}>{c.issuer}</span>
              {c.name && <span style={{ color: C.ink }}>{' '}{c.name}</span>}
              {date && <span style={{ color: C.ink }}>{' · '}{date}</span>}
            </p>
          );
        })}
      </CvSection>

      {/* ── Skills ── */}
      <CvSection empty={skillRows.length === 0} renderHeading={() => <SectionHeading>Skills</SectionHeading>}>
        {skillRows.map(({ label, value }) => (
          <p key={label} style={{ fontSize: '10pt', margin: '0 0 7px', lineHeight: 1.4 }}>
            <span style={{ fontFamily: BODY_STACK, fontWeight: 700, fontSize: '10.5pt', color: C.accent }}>{label}</span>
            <span style={{ color: C.ink }}>{' '}{value}</span>
          </p>
        ))}
      </CvSection>
    </div>
  );
}
