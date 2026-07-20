/**
 * Vintage — Garamond serif template for sommeliers & fine-dining staff.
 *
 * Layout: full-width header (square photo + red name block), then two
 * columns — main (Profile, Employment History) and 30% sidebar (Skills,
 * Education, Certifications, Expertise, Languages).
 * No fills, rules or icons — whitespace only. EB Garamond throughout.
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

export function VintageTemplate({ data, colours }: { data: ResumeData; colours?: TemplateColours }) {
  const C = {
    bg:    colours?.background ?? '#ffffff',
    name:  colours?.primary    ?? '#E02020',
    title: colours?.accent     ?? '#E02020',
    ink:   colours?.text       ?? '#24292e',
    muted: '#6b7684',
  };

  /** top = extra top margin — only main-column headings after the first get 19px. */
  function SectionHeading({ children, top = 0 }: { children: React.ReactNode; top?: number }) {
    return (
      <h2
        style={{
          fontSize:      '10.5pt',
          fontWeight:    400,
          color:         C.ink,
          textTransform: 'uppercase',
          letterSpacing: '1.6px',
          margin:        `${top}px 0 11px`,
          lineHeight:    1.2,
        }}
      >
        {children}
      </h2>
    );
  }

  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const entryTokens = {
    titleColor: C.ink,
    metaColor:  C.muted,
    bodyColor:  C.ink,
    metaItalic: false,
    datesRight: false,
    bulletStyle: 'dot' as const,
    titleSize:  '10.5pt',
    titleWeight: 700,
    metaSize:   '8pt',
    bodySize:   '9.5pt',
    bodyLineHeight: 1.36,
  };

  const filled = filledLanguages(hospitality);

  const expertise: { label: string; value: string }[] = [];
  if (hospitality.wineKnowledge && hospitality.wineKnowledge !== 'None') expertise.push({ label: 'Wine', value: hospitality.wineKnowledge });
  if (hospitality.spiritsKnowledge && hospitality.spiritsKnowledge !== 'None') expertise.push({ label: 'Spirits', value: hospitality.spiritsKnowledge });
  if (hospitality.serviceStyles.length > 0) expertise.push({ label: 'Service', value: hospitality.serviceStyles.join(', ') });
  if (hospitality.posSystems.length > 0) expertise.push({ label: 'POS', value: hospitality.posSystems.join(', ') });
  if (hospitality.foodSafety) expertise.push({ label: 'Food Safety', value: hospitality.foodSafety });

  /** Bold 9.5pt name line + 8pt muted line — the shared sidebar-entry style. */
  function SideEntry({ name, sub }: { name: string; sub?: string }) {
    return (
      <div style={{ marginBottom: 15 }}>
        <p style={{ fontSize: '9.5pt', fontWeight: 600, color: C.ink, margin: 0, lineHeight: 1.3 }}>{name}</p>
        {sub && (
          <p style={{ fontSize: '8pt', color: C.muted, margin: '2px 0 0', lineHeight: 1.3 }}>{sub}</p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        background: C.bg,
        color:      C.ink,
        fontFamily: "'EB Garamond', Garamond, Georgia, serif",
        fontSize:   '9.5pt',
        lineHeight: 1.36,
        padding:    '57px 53px 53px',
        minHeight:  1123,
        boxSizing:  'border-box',
      }}
    >
      {/* ── Header ── */}
      <header style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
        {personal.photo && (
          <PremiumPhotoPlaceholder src={personal.photo} size={91} shape="square" />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '20pt', fontWeight: 600, color: C.name, margin: 0, lineHeight: 1.15 }}>
            {personal.fullName || 'Your Name'}
            {personal.title && (
              <>
                ,<br />
                <span style={{ color: C.title }}>{personal.title}</span>
              </>
            )}
          </h1>
          <p style={{ fontSize: '8pt', color: C.muted, margin: '6px 0 0', lineHeight: 1.4 }}>
            {[personal.location, personal.email, personal.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
      </header>

      {/* ── Columns ── */}
      <div style={{ display: 'flex', marginTop: 24 }}>
        {/* Main */}
        <main style={{ flex: 1, minWidth: 0, paddingRight: 42 }}>
          <CvSection
            empty={!summary}
            renderHeading={() => <SectionHeading>Profile</SectionHeading>}
          >
            <p style={{ fontSize: '9.5pt', color: C.ink, margin: 0, lineHeight: 1.36 }}>{summary}</p>
          </CvSection>

          <CvSection
            empty={!hasExperience(experience)}
            renderHeading={() => <SectionHeading top={summary ? 19 : 0}>Employment History</SectionHeading>}
          >
            {experience.map((e) => (
              <CvEntry
                key={e.id}
                title={[e.role, e.venue, e.location].filter(Boolean).join(', ')}
                meta={dateRange(e.startDate, e.endDate, e.current)}
                description={e.bullets ?? e.description}
                tokens={entryTokens}
                className="mb-[15px]"
              />
            ))}
          </CvSection>
        </main>

        {/* Sidebar */}
        <aside style={{ flex: '0 0 30%', minWidth: 0 }}>
          <CvSection
            empty={!hasSkills(skills)}
            renderHeading={() => <SectionHeading>Skills</SectionHeading>}
          >
            {skills.map((s) => (
              <p key={s} style={{ fontSize: '9.5pt', color: C.ink, margin: '0 0 11px', lineHeight: 1.3 }}>{s}</p>
            ))}
          </CvSection>

          <CvSection
            empty={!hasEducation(education)}
            renderHeading={() => <SectionHeading>Education</SectionHeading>}
          >
            {education.map((e) => {
              const name = [e.degree, e.field].filter(Boolean).join(', ') || e.school;
              const sub = [name === e.school ? '' : e.school, dateRange(e.startDate, e.endDate)]
                .filter(Boolean)
                .join(' · ');
              return <SideEntry key={e.id} name={name} sub={sub} />;
            })}
          </CvSection>

          <CvSection
            empty={!hasCertifications(certifications)}
            renderHeading={() => <SectionHeading>Certifications</SectionHeading>}
          >
            {certifications.map((c) => (
              <SideEntry
                key={c.id}
                name={c.name}
                sub={[c.issuer, c.expiry || c.year].filter(Boolean).join(' · ')}
              />
            ))}
          </CvSection>

          <CvSection
            empty={expertise.length === 0}
            renderHeading={() => <SectionHeading>Expertise</SectionHeading>}
          >
            {expertise.map(({ label, value }) => (
              <SideEntry key={label} name={label} sub={value} />
            ))}
          </CvSection>

          <CvSection
            empty={filled.length === 0}
            renderHeading={() => <SectionHeading>Languages</SectionHeading>}
          >
            {filled.map((l) => (
              <SideEntry key={l.name} name={l.name} sub={l.level} />
            ))}
          </CvSection>
        </aside>
      </div>
    </div>
  );
}
