/**
 * Harbour — Two-column flexbox template for hotel & resort roles.
 *
 * Layout: 35% #7c3aed sidebar + 65% white main column.
 * Sidebar: circular 68px photo at top, skills, certifications, hospitality info.
 * Main: experience, education, profile summary.
 */

import { ResumeData } from '@/types/resume';
import { dateRange } from '../utils';
import { CvSection } from '@/lib/cv-templates/CvSection';
import { CvEntry } from '@/lib/cv-templates/CvEntry';
import { PremiumPhotoPlaceholder } from './PremiumPhotoPlaceholder';

const C = {
  sidebarBg:   '#7c3aed',
  mainBg:      '#ffffff',
  sideHeading: '#ede9fe',
  sideBody:    '#e9d5ff',
  sideMuted:   '#c4b5fd',
  mainName:    '#1e293b',
  mainTitle:   '#7c3aed',
  mainHeading: '#1e293b',
  mainBody:    '#334155',
  mainMuted:   '#64748b',
  divider:     '#ddd6fe',
} as const;

function SideHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize:      '8pt',
        fontWeight:    700,
        color:         C.sideHeading,
        textTransform: 'uppercase',
        letterSpacing: '0.15em',
        margin:        '16pt 0 6pt',
        lineHeight:    1.2,
        borderBottom:  `1px solid rgba(255,255,255,0.2)`,
        paddingBottom:  4,
      }}
    >
      {children}
    </h2>
  );
}

function MainHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontSize:      '9pt',
        fontWeight:    700,
        color:         C.mainHeading,
        textTransform: 'uppercase',
        letterSpacing: '0.12em',
        margin:        '14pt 0 6pt',
        lineHeight:    1.2,
        borderBottom:  `2px solid #7c3aed`,
        paddingBottom:  4,
      }}
    >
      {children}
    </h2>
  );
}

export function HarbourTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const entryTokens = {
    titleColor: C.mainName,
    metaColor:  C.mainMuted,
    bodyColor:  C.mainBody,
    metaItalic: false,
    datesRight: true,
  };

  const langs = hospitality.languages.length > 0
    ? hospitality.languages.map((l) => `${l.name} (${l.level})`).join(', ')
    : null;

  const additionalInfo: { label: string; value: string }[] = [];
  if (hospitality.wineKnowledge && hospitality.wineKnowledge !== 'None') additionalInfo.push({ label: 'Wine', value: hospitality.wineKnowledge });
  if (hospitality.spiritsKnowledge && hospitality.spiritsKnowledge !== 'None') additionalInfo.push({ label: 'Spirits', value: hospitality.spiritsKnowledge });
  if (hospitality.serviceStyles.length > 0) additionalInfo.push({ label: 'Service', value: hospitality.serviceStyles.join(', ') });
  if (hospitality.posSystems.length > 0) additionalInfo.push({ label: 'POS', value: hospitality.posSystems.join(', ') });
  if (hospitality.foodSafety) additionalInfo.push({ label: 'Food Safety', value: hospitality.foodSafety });

  return (
    <div
      style={{
        display:   'flex',
        minHeight:  1123,
        boxSizing: 'border-box',
        fontSize:  '10pt',
        lineHeight: 1.5,
      }}
    >
      {/* ── Sidebar ── */}
      <aside
        style={{
          flex:       '0 0 35%',
          background: C.sidebarBg,
          padding:    '48px 24px 48px 28px',
          color:      C.sideBody,
          minWidth:   0,
        }}
      >
        {/* Photo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <PremiumPhotoPlaceholder
            src={personal.photo}
            size={68}
            shape="circle"
            border="3px solid rgba(255,255,255,0.4)"
          />
        </div>

        {/* Name + title in sidebar (visible on small print widths) */}
        <div style={{ textAlign: 'center', marginBottom: 4 }}>
          <p style={{ fontWeight: 700, fontSize: '12pt', color: '#ffffff', margin: 0, lineHeight: 1.2, wordBreak: 'break-word' }}>
            {personal.fullName || 'Your Name'}
          </p>
          {personal.title && (
            <p style={{ fontSize: '9pt', color: C.sideMuted, margin: '4px 0 0', lineHeight: 1.3 }}>
              {personal.title}
            </p>
          )}
        </div>

        {/* Contact */}
        <div style={{ marginTop: 14, marginBottom: 4 }}>
          {[personal.email, personal.phone, personal.location].filter(Boolean).map((v) => (
            <p key={v} style={{ fontSize: '8.5pt', color: C.sideBody, margin: '0 0 3px', lineHeight: 1.4, wordBreak: 'break-all' }}>{v}</p>
          ))}
          {personal.links && personal.links.map((l) => (
            <p key={l.url} style={{ fontSize: '8.5pt', color: C.sideBody, margin: '0 0 3px', lineHeight: 1.4, wordBreak: 'break-all' }}>{l.url}</p>
          ))}
        </div>

        <CvSection
          empty={skills.length === 0}
          renderHeading={() => <SideHeading>Skills</SideHeading>}
        >
          {skills.map((s) => (
            <p key={s} style={{ fontSize: '9pt', color: C.sideBody, margin: '0 0 4px', lineHeight: 1.4 }}>{s}</p>
          ))}
        </CvSection>

        <CvSection
          empty={certifications.length === 0}
          renderHeading={() => <SideHeading>Certifications</SideHeading>}
        >
          {certifications.map((c) => (
            <div key={c.id} style={{ marginBottom: 6 }}>
              <p style={{ fontSize: '9pt', color: C.sideHeading, fontWeight: 700, margin: 0, lineHeight: 1.3 }}>{c.name}</p>
              <p style={{ fontSize: '8.5pt', color: C.sideBody, margin: '1px 0 0', lineHeight: 1.3 }}>
                {c.issuer && <span>{c.issuer} · </span>}
                {c.expiry || (c.year ? `Obtained ${c.year}` : 'No expiry')}
              </p>
            </div>
          ))}
        </CvSection>

        {additionalInfo.length > 0 && (
          <CvSection
            empty={false}
            renderHeading={() => <SideHeading>Expertise</SideHeading>}
          >
            {additionalInfo.map(({ label, value }) => (
              <p key={label} style={{ fontSize: '9pt', color: C.sideBody, margin: '0 0 5px', lineHeight: 1.4 }}>
                <span style={{ fontWeight: 700, color: C.sideHeading }}>{label}:</span>{' '}
                {value}
              </p>
            ))}
          </CvSection>
        )}

        {langs && (
          <CvSection
            empty={false}
            renderHeading={() => <SideHeading>Languages</SideHeading>}
          >
            <p style={{ fontSize: '9pt', color: C.sideBody, margin: 0, lineHeight: 1.5 }}>{langs}</p>
          </CvSection>
        )}
      </aside>

      {/* ── Main ── */}
      <main
        style={{
          flex:      1,
          background: C.mainBg,
          padding:   '48px 36px 48px 32px',
          minWidth:  0,
          color:     C.mainBody,
        }}
      >
        <CvSection
          empty={!summary}
          renderHeading={() => <MainHeading>Profile</MainHeading>}
        >
          <p style={{ fontSize: '10pt', color: C.mainBody, margin: 0, lineHeight: 1.55 }}>{summary}</p>
        </CvSection>

        <CvSection
          empty={experience.length === 0}
          renderHeading={() => <MainHeading>Experience</MainHeading>}
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
          empty={education.length === 0}
          renderHeading={() => <MainHeading>Education</MainHeading>}
        >
          {education.map((e) => (
            <div key={e.id} style={{ marginBottom: 8 }}>
              <p style={{ fontWeight: 700, color: C.mainName, margin: 0, lineHeight: 1.3 }}>
                {[e.degree, e.field].filter(Boolean).join(', ')}
              </p>
              <p style={{ fontSize: '9.5pt', color: C.mainMuted, margin: '2px 0 0', lineHeight: 1.3 }}>
                {e.school}{e.startDate || e.endDate ? ` · ${dateRange(e.startDate, e.endDate)}` : ''}
              </p>
            </div>
          ))}
        </CvSection>
      </main>
    </div>
  );
}
