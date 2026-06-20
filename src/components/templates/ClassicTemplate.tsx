import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

/**
 * Classic — clean two-column A4. Dark header band, blue accent.
 */
export function ClassicTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills } = data;
  const ink = "#1a1a2e";
  const accent = "#2563eb";
  const muted = "#64748b";
  const light = "#e2e8f0";
  const bg = "#ffffff";
  const sidebarBg = "#f1f5f9";

  const entryTokens = { titleColor: ink, metaColor: muted, bodyColor: ink, datesRight: true };

  return (
    <div style={{ background: bg, color: ink, fontFamily: "'Helvetica Neue', Arial, sans-serif", fontSize: TS.body.rem, lineHeight: TS.body.lh }}>
      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <header
        style={{ background: ink, color: "#fff" }}
        className="flex items-center gap-6 px-10 py-8"
      >
        {personal.photo ? (
          <img
            src={personal.photo}
            alt=""
            className="h-24 w-24 shrink-0 rounded-full object-cover"
            style={{ border: `3px solid ${accent}` }}
          />
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold"
            style={{ background: accent, color: "#fff" }}
          >
            {personal.fullName ? personal.fullName.charAt(0).toUpperCase() : "?"}
          </div>
        )}
        {/* min-w-0 prevents long names overflowing into photo */}
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold leading-tight tracking-tight" style={{ color: "#fff" }}>
            {personal.fullName || "Your Name"}
          </h1>
          <p className={`mt-1 ${TS.jobTitle.tw} uppercase tracking-[0.2em]`} style={{ color: accent }}>
            {personal.title || "Hospitality Professional"}
          </p>
          <div className={`mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 ${TS.metaSmall.tw}`} style={{ color: "#cbd5e1" }}>
            {personal.email && <span>✉ {personal.email}</span>}
            {personal.phone && <span>✆ {personal.phone}</span>}
            {personal.location && <span>⌖ {personal.location}</span>}
            {personal.links?.map((l) => <span key={l.label}>↗ {l.url}</span>)}
          </div>
        </div>
      </header>

      {/* ── TWO-COLUMN BODY ────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: 900 }}>
        {/* LEFT COLUMN */}
        <aside className="w-[220px] shrink-0 space-y-6 px-7 py-8" style={{ background: sidebarBg, borderRight: `1px solid ${light}` }}>
          <CvSection
            empty={!summary}
            renderHeading={() => <SideHeading label="Summary" accent={accent} />}
          >
            <p className={`mt-2 ${TS.body.tw}`} style={{ color: muted }}>{summary}</p>
          </CvSection>

          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <SideHeading label="Skills" accent={accent} />}
          >
            <ul className="mt-2 space-y-1.5">
              {skills.map((skill) => (
                <li key={skill} className="flex items-center gap-2">
                  <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />
                  <span className={TS.body.tw} style={{ color: ink }}>{skill}</span>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={data.certifications.length === 0}
            renderHeading={() => <SideHeading label="Certifications" accent={accent} />}
          >
            <ul className="mt-2 space-y-2">
              {data.certifications.map((c) => (
                <li key={c.id}>
                  <p className={`${TS.entryTitle.tw} leading-tight`} style={{ color: ink }}>{c.name}</p>
                  <p className={TS.entryMeta.tw} style={{ color: muted }}>{c.issuer} · {c.year}</p>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={
              data.hospitality.serviceStyles.length === 0 &&
              data.hospitality.posSystems.length === 0 &&
              data.hospitality.languages.length === 0
            }
            renderHeading={() => <SideHeading label="Hospitality" accent={accent} />}
          >
            <div className={`mt-2 space-y-1.5 ${TS.metaSmall.tw}`} style={{ color: muted }}>
              {data.hospitality.serviceStyles.length > 0 && (
                <p><span className="font-semibold" style={{ color: ink }}>Service: </span>{data.hospitality.serviceStyles.join(", ")}</p>
              )}
              {data.hospitality.posSystems.length > 0 && (
                <p><span className="font-semibold" style={{ color: ink }}>POS: </span>{data.hospitality.posSystems.join(", ")}</p>
              )}
              {data.hospitality.wineKnowledge !== "None" && (
                <p><span className="font-semibold" style={{ color: ink }}>Wine: </span>{data.hospitality.wineKnowledge}</p>
              )}
              {data.hospitality.languages.length > 0 && (
                <p><span className="font-semibold" style={{ color: ink }}>Languages: </span>{data.hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}</p>
              )}
            </div>
          </CvSection>
        </aside>

        {/* RIGHT COLUMN */}
        <main className="min-w-0 flex-1 space-y-7 px-8 py-8">
          <CvSection
            empty={experience.length === 0}
            renderHeading={() => <MainHeading label="Experience" accent={accent} />}
          >
            <div className="mt-4 space-y-5">
              {experience.map((e) => (
                <div key={e.id} className="relative pl-4">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full" style={{ background: accent }} />
                  <CvEntry
                    title={e.role}
                    meta={[e.venue, e.location].filter(Boolean).join(" · ")}
                    dates={dateRange(e.startDate, e.endDate, e.current)}
                    description={e.bullets ?? e.description}
                    tokens={{ ...entryTokens, metaColor: muted, metaItalic: false }}
                  />
                </div>
              ))}
            </div>
          </CvSection>

          <CvSection
            empty={education.length === 0}
            renderHeading={() => <MainHeading label="Education" accent={accent} />}
          >
            <div className="mt-4 space-y-4">
              {education.map((e) => (
                <div key={e.id} className="relative pl-4">
                  <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full" style={{ background: accent }} />
                  <CvEntry
                    title={[e.degree, e.field].filter(Boolean).join(", ")}
                    meta={e.school}
                    dates={[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                    description={e.bullets ?? e.description}
                    tokens={{ ...entryTokens, metaColor: muted, metaItalic: true }}
                  />
                </div>
              ))}
            </div>
          </CvSection>
        </main>
      </div>
    </div>
  );
}

function SideHeading({ label, accent }: { label: string; accent: string }) {
  return (
    <div>
      <h2 className={TS.sectionHeader.tw} style={{ color: accent }}>{label}</h2>
    </div>
  );
}

function MainHeading({ label, accent }: { label: string; accent: string }) {
  return (
    <div>
      <h2 className={TS.sectionHeader.tw} style={{ color: accent }}>{label}</h2>
      <div className="mt-1 h-0.5 w-8 rounded-full" style={{ background: accent }} />
    </div>
  );
}
