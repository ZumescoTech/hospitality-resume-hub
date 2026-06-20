/**
 * Elegant — visual/portfolio two-column CV template.
 *
 * Layout: main column (65.5%) | sidebar (34.5%) separated by a 1px #D9D9D9 rule.
 * Typography: serif (Lora via Google Fonts; falls back to Georgia).
 * Photo: circular, ~86px (≈0.9in at 96dpi).
 *
 * ⚠ ATS note: two-column layouts can confuse ATS parsers.
 */

import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";

const C = {
  accent:  "#A6433C",
  heading: "#5A5A5A",
  text:    "#3F3F3F",
  muted:   "#8A8A8A",
  divider: "#D9D9D9",
} as const;

const SERIF = "'Lora', Georgia, 'Times New Roman', serif";

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily:    SERIF,
        fontSize:      "11pt",
        fontWeight:    "normal",
        color:         C.heading,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        margin:        "10pt 0 5pt",
        lineHeight:    1.2,
        borderBottom:  `1px solid ${C.divider}`,
        paddingBottom: 4,
      }}
    >
      {children}
    </h2>
  );
}

export function ElegantTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality, references } = data;

  const additionalInfo: { label: string; value: string }[] = [];
  if (hospitality.languages.length > 0) additionalInfo.push({ label: "Languages", value: hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ") });
  if (hospitality.wineKnowledge !== "None") additionalInfo.push({ label: "Wine", value: hospitality.wineKnowledge });
  if (hospitality.spiritsKnowledge !== "None") additionalInfo.push({ label: "Spirits", value: hospitality.spiritsKnowledge });
  if (hospitality.serviceStyles.length > 0) additionalInfo.push({ label: "Service", value: hospitality.serviceStyles.join(", ") });
  if (hospitality.posSystems.length > 0) additionalInfo.push({ label: "POS", value: hospitality.posSystems.join(", ") });
  if (hospitality.foodSafety) additionalInfo.push({ label: "Food safety", value: hospitality.foodSafety });
  if (hospitality.allergens) additionalInfo.push({ label: "Allergens", value: "Trained" });

  const entryTokens = { titleColor: C.text, metaColor: C.muted, bodyColor: C.text, metaItalic: true, datesRight: false };

  return (
    <div
      style={{
        fontFamily: SERIF,
        color:      C.text,
        fontSize:   "10.5pt",
        lineHeight: 1.5,
        background: "#ffffff",
        padding:    "54px 66px",
        minHeight:  1123,
        boxSizing:  "border-box",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap');`}</style>

      {/* ── Header ── */}
      <header style={{ display: "flex", alignItems: "center", gap: 22, marginBottom: 32 }}>
        {personal.photo && (
          <img
            src={personal.photo}
            alt=""
            style={{ width: 86, height: 86, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block", border: `2px solid ${C.divider}` }}
          />
        )}
        {/* flex: 1 + minWidth: 0 — prevents long names overflowing into photo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1
            style={{
              fontFamily: SERIF,
              fontStyle:  "italic",
              fontWeight: "normal",
              fontSize:   "22pt",
              color:      C.accent,
              lineHeight: 1.2,
              margin:     0,
            }}
          >
            {personal.fullName || "Your Name"}
            {personal.title ? `, ${personal.title}` : ""}
          </h1>
          <p style={{ margin: "6px 0 0", fontSize: "9pt", color: C.muted, lineHeight: 1.4 }}>
            {[personal.location, personal.email, personal.phone].filter(Boolean).join(" · ")}
          </p>
          {personal.links && personal.links.length > 0 && (
            <p style={{ margin: "2px 0 0", fontSize: "9pt", color: C.muted, lineHeight: 1.4 }}>
              {personal.links.map((l) => l.url).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {/* ── Two-column body ── */}
      <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>

        <main style={{ flex: "0 0 65.5%", minWidth: 0 }}>
          <CvSection
            empty={!summary}
            renderHeading={() => <SectionHeading>Profile</SectionHeading>}
          >
            <p style={{ fontSize: "10.5pt", color: C.text, lineHeight: 1.5, margin: 0 }}>{summary}</p>
          </CvSection>

          <CvSection
            empty={experience.length === 0}
            renderHeading={() => <SectionHeading>Experience</SectionHeading>}
          >
            {experience.map((e) => (
              <CvEntry
                key={e.id}
                title={e.role}
                meta={[e.venue, e.location].filter(Boolean).join(", ")}
                dates={dateRange(e.startDate, e.endDate, e.current)}
                description={e.bullets ?? e.description}
                tokens={entryTokens}
                className="mb-4"
              />
            ))}
          </CvSection>

          <CvSection
            empty={education.length === 0}
            renderHeading={() => <SectionHeading>Education</SectionHeading>}
          >
            {education.map((e) => (
              <div key={e.id} style={{ marginBottom: 10 }}>
                <p style={{ fontWeight: "bold", fontSize: "11pt", color: C.text, margin: 0, lineHeight: 1.3 }}>
                  {[e.degree, e.field].filter(Boolean).join(", ")}
                </p>
                <p style={{ fontSize: "10pt", color: C.muted, margin: "2px 0 0", lineHeight: 1.3 }}>
                  {e.school}{e.startDate || e.endDate ? ` · ${dateRange(e.startDate, e.endDate)}` : ""}
                </p>
              </div>
            ))}
          </CvSection>
        </main>

        <aside style={{ flex: 1, minWidth: 0, borderLeft: `1px solid ${C.divider}`, paddingLeft: 24 }}>
          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <SectionHeading>Skills</SectionHeading>}
          >
            {skills.map((s) => (
              <p key={s} style={{ fontSize: "10.5pt", color: C.text, margin: "0 0 6px", lineHeight: 1.4 }}>{s}</p>
            ))}
          </CvSection>

          <CvSection
            empty={additionalInfo.length === 0}
            renderHeading={() => <SectionHeading>Additional Info</SectionHeading>}
          >
            {additionalInfo.map(({ label, value }) => (
              <p key={label} style={{ fontSize: "10pt", color: C.text, margin: "0 0 5px", lineHeight: 1.4 }}>
                <span style={{ fontWeight: "bold" }}>{label}:</span>{" "}
                <span style={{ color: C.muted }}>{value}</span>
              </p>
            ))}
          </CvSection>

          <CvSection
            empty={certifications.length === 0}
            renderHeading={() => <SectionHeading>Certifications</SectionHeading>}
          >
            {certifications.map((c) => (
              <p key={c.id} style={{ fontSize: "10pt", color: C.text, margin: "0 0 6px", lineHeight: 1.4 }}>
                <span style={{ fontWeight: "bold" }}>{c.name}</span>
                {c.issuer || c.year ? <span style={{ color: C.muted }}> — {[c.issuer, c.year].filter(Boolean).join(", ")}</span> : null}
              </p>
            ))}
          </CvSection>

          <CvSection
            empty={!references}
            renderHeading={() => <SectionHeading>References</SectionHeading>}
          >
            <p style={{ fontSize: "10pt", color: C.text, margin: 0, lineHeight: 1.5 }}>{references}</p>
          </CvSection>
        </aside>
      </div>
    </div>
  );
}
