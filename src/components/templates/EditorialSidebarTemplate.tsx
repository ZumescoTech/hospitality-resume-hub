/**
 * Editorial Sidebar — visual/portfolio two-column CV template.
 *
 * Layout: main column (~68.7%) | sidebar (~31.3%) separated by a 1px #D9D9D9 rule.
 * Typography: serif (Lora via Google Fonts; falls back to Georgia).
 *
 * ⚠ Font note: the reference spec calls for Cambria, which is a Windows system
 * font not reliably available on macOS, Linux, or web rendering environments.
 * This template uses "Lora" (Google Font) for cross-platform consistency. The PDF
 * export falls back to Times-Roman (the closest built-in react-pdf serif).
 *
 * ⚠ ATS note: two-column layouts can confuse ATS parsers. Offer this template
 * alongside a single-column "ATS-safe" option and label it clearly as visual/portfolio.
 */

import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  accent:  "#A6433C",  // name only — muted terracotta
  heading: "#5A5A5A",  // section headings
  text:    "#3F3F3F",  // body
  muted:   "#8A8A8A",  // dates, location, secondary
  divider: "#D9D9D9",  // vertical column rule
} as const;

const SERIF = "'Lora', Georgia, 'Times New Roman', serif";

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily:    SERIF,
        fontSize:      "12pt",
        fontWeight:    "normal",
        color:         C.heading,
        textTransform: "uppercase",
        letterSpacing: "0.2em",
        margin:        "10pt 0 5pt",
        lineHeight:    1.2,
      }}
    >
      {children}
    </h2>
  );
}

// ─── Template ─────────────────────────────────────────────────────────────────

export function EditorialSidebarTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  // Build "Additional Info" key-value pairs from hospitality + certifications data
  const additionalInfo: { label: string; value: string }[] = [];
  if (hospitality.languages.length > 0) {
    additionalInfo.push({
      label: "Languages",
      value: hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", "),
    });
  }
  if (hospitality.wineKnowledge !== "None") {
    additionalInfo.push({ label: "Wine", value: hospitality.wineKnowledge });
  }
  if (hospitality.spiritsKnowledge !== "None") {
    additionalInfo.push({ label: "Spirits", value: hospitality.spiritsKnowledge });
  }
  if (hospitality.serviceStyles.length > 0) {
    additionalInfo.push({ label: "Service styles", value: hospitality.serviceStyles.join(", ") });
  }
  if (hospitality.posSystems.length > 0) {
    additionalInfo.push({ label: "POS systems", value: hospitality.posSystems.join(", ") });
  }
  if (hospitality.foodSafety) {
    additionalInfo.push({ label: "Food safety", value: hospitality.foodSafety });
  }
  if (hospitality.allergens) {
    additionalInfo.push({ label: "Allergen awareness", value: "Trained" });
  }

  return (
    <div
      style={{
        fontFamily:  SERIF,
        color:       C.text,
        fontSize:    "10.5pt",
        lineHeight:  1.4,
        background:  "#ffffff",
        // A4 page padding: ~0.56in top/bottom, ~0.69in left/right (96dpi)
        padding:     "54px 66px",
        minHeight:   1123,
        boxSizing:   "border-box",
      }}
    >
      {/* Load Lora from Google Fonts for cross-platform serif rendering */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400;1,700&display=swap');`}</style>

      {/* ── Header ────────────────────────────────────────────── */}
      <header style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 28 }}>
        {personal.photo && (
          <img
            src={personal.photo}
            alt=""
            style={{
              width:        95,
              height:       95,
              borderRadius: 12,
              objectFit:    "cover",
              flexShrink:   0,
              display:      "block",
            }}
          />
        )}
        <div>
          <h1
            style={{
              fontFamily:  SERIF,
              fontStyle:   "italic",
              fontWeight:  "normal",
              fontSize:    "22pt",
              color:       C.accent,
              lineHeight:  1.2,
              margin:      0,
            }}
          >
            {personal.fullName || "Your Name"}
            {personal.title ? `, ${personal.title}` : ""}
          </h1>
          {personal.location && (
            <p
              style={{
                margin:        "5px 0 0",
                fontSize:      "9pt",
                color:         C.muted,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                lineHeight:    1.3,
              }}
            >
              {personal.location}
            </p>
          )}
          {(personal.email || personal.phone) && (
            <p
              style={{
                margin:     "4px 0 0",
                fontSize:   "9pt",
                color:      C.muted,
                lineHeight: 1.3,
              }}
            >
              {[personal.email, personal.phone].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </header>

      {/* ── Two-column body ───────────────────────────────────── */}
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>

        {/* ── Main column (~68.7%) ─────────────────────────── */}
        <main style={{ flex: "0 0 68.7%", minWidth: 0 }}>

          {/* Profile */}
          {summary && (
            <section style={{ marginBottom: 20 }}>
              <SectionHeading>Profile</SectionHeading>
              <p
                style={{
                  fontSize:   "10.5pt",
                  color:      C.text,
                  lineHeight: 1.1,
                  margin:     0,
                }}
              >
                {summary}
              </p>
            </section>
          )}

          {/* Experience */}
          {experience.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionHeading>Experience</SectionHeading>
              <div>
                {experience.map((e) => {
                  // Split description into bullet lines; strip leading bullet chars
                  const bullets = e.description
                    ? e.description.split("\n").map((l) => l.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
                    : [];

                  return (
                    <div key={e.id} style={{ marginBottom: 14 }}>
                      <p
                        style={{
                          fontWeight: "bold",
                          fontSize:   "11pt",
                          color:      C.text,
                          margin:     0,
                          lineHeight: 1.3,
                        }}
                      >
                        {[e.role, e.venue, e.location].filter(Boolean).join(", ")}
                      </p>
                      <p
                        style={{
                          fontStyle:  "italic",
                          fontSize:   "10pt",
                          color:      C.muted,
                          margin:     "2px 0 4px",
                          lineHeight: 1.3,
                        }}
                      >
                        {dateRange(e.startDate, e.endDate, e.current)}
                      </p>
                      {bullets.length > 0 ? (
                        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                          {bullets.map((b, i) => (
                            <li
                              key={i}
                              style={{
                                display:      "flex",
                                gap:          6,
                                fontSize:     "10.5pt",
                                color:        C.text,
                                lineHeight:   1.0,
                                marginBottom: 1,
                              }}
                            >
                              <span style={{ flexShrink: 0, lineHeight: 1.1 }}>•</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      ) : e.description ? (
                        <p
                          style={{
                            fontSize:   "10.5pt",
                            color:      C.text,
                            margin:     0,
                            lineHeight: 1.1,
                          }}
                        >
                          {e.description}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <section>
              <SectionHeading>Education</SectionHeading>
              {education.map((e) => (
                <p
                  key={e.id}
                  style={{
                    fontWeight:   "bold",
                    fontSize:     "11pt",
                    color:        C.text,
                    margin:       "0 0 6px",
                    lineHeight:   1.3,
                  }}
                >
                  {[e.school, [e.degree, e.field].filter(Boolean).join(", ")].filter(Boolean).join(", ")}
                </p>
              ))}
            </section>
          )}
        </main>

        {/* ── Sidebar (~31.3%) ─────────────────────────────── */}
        <aside
          style={{
            flex:        1,
            minWidth:    0,
            borderLeft:  `1px solid ${C.divider}`,
            paddingLeft: 20,
          }}
        >
          {/* Skills */}
          {skills.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionHeading>Skills</SectionHeading>
              {skills.map((s) => (
                <p
                  key={s}
                  style={{
                    fontSize:     "10.5pt",
                    color:        C.text,
                    margin:       "0 0 8px",
                    lineHeight:   1.3,
                  }}
                >
                  {s}
                </p>
              ))}
            </section>
          )}

          {/* Additional Info */}
          {additionalInfo.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionHeading>Additional Info</SectionHeading>
              {additionalInfo.map(({ label, value }) => (
                <p
                  key={label}
                  style={{
                    fontSize:     "10.5pt",
                    color:        C.text,
                    margin:       "0 0 4px",
                    lineHeight:   1.3,
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{label}:</span>{" "}
                  <span style={{ fontWeight: "normal" }}>{value}</span>
                </p>
              ))}
            </section>
          )}

          {/* Certifications */}
          {certifications.length > 0 && (
            <section style={{ marginBottom: 20 }}>
              <SectionHeading>Certifications</SectionHeading>
              {certifications.map((c) => (
                <p
                  key={c.id}
                  style={{
                    fontSize:     "10.5pt",
                    color:        C.text,
                    margin:       "0 0 6px",
                    lineHeight:   1.3,
                  }}
                >
                  <span style={{ fontWeight: "bold" }}>{c.name}</span>
                  {" — "}
                  <span style={{ color: C.muted }}>{c.issuer}, {c.year}</span>
                </p>
              ))}
            </section>
          )}

          {/* References — always shown */}
          <section>
            <SectionHeading>References</SectionHeading>
            <p style={{ fontSize: "10.5pt", color: C.text, margin: 0, lineHeight: 1.3 }}>
              Available upon request.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
