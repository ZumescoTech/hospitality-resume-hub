import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

/**
 * Modern Minimal — for bartenders & mixologists.
 * Asymmetric two-column, monospace accents, dramatic name.
 */
export function TokyoTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#111111";
  const muted = "#7a7a7a";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  const entryTokens = { titleColor: ink, metaColor: muted, bodyColor: ink, datesRight: false };

  return (
    <div style={{ background: "#ffffff", color: ink, fontSize: TS.body.rem, lineHeight: TS.body.lh }}>
      <header className="grid grid-cols-[auto_1fr] items-end gap-6 px-12 pb-8 pt-12">
        {personal.photo ? (
          <img src={personal.photo} alt="" className="h-28 w-28 rounded-none object-cover grayscale" />
        ) : (
          <div className="h-28 w-28 bg-[#f1f1f1]" />
        )}
        {/* 1fr column naturally prevents overflow — no min-w-0 needed in grid */}
        <div>
          <p className={`${TS.metaSmall.tw} uppercase tracking-[0.4em]`} style={{ color: muted, fontFamily: mono }}>
            {personal.title || "Bartender · Mixologist"}
          </p>
          {/* Intentionally dramatic — Tokyo's visual identity uses 5xl name */}
          <h1 className="mt-2 text-5xl font-light leading-none tracking-tight">
            {personal.fullName || "Your Name"}
          </h1>
          <p className={`mt-3 ${TS.metaSmall.tw}`} style={{ fontFamily: mono, color: muted }}>
            {[personal.email, personal.phone, personal.location].filter(Boolean).join("   /   ")}
          </p>
        </div>
      </header>

      <div className="h-px w-full" style={{ background: "#111" }} />

      <div className="grid grid-cols-[1fr_2fr] gap-10 px-12 py-10">
        <aside className="space-y-7">
          <CvSection
            empty={!summary}
            renderHeading={() => <MonoHeading title="01 / Profile" mono={mono} />}
          >
            <p className={TS.body.tw}>{summary}</p>
          </CvSection>

          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <MonoHeading title="02 / Skills" mono={mono} />}
          >
            <ul className="space-y-1">
              {skills.map((s) => (
                <li key={s} className={`flex gap-2 ${TS.body.tw}`}>
                  <span style={{ color: muted, fontFamily: mono }}>—</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={
              hospitality.spiritsKnowledge === "None" &&
              hospitality.wineKnowledge === "None" &&
              hospitality.serviceStyles.length === 0 &&
              hospitality.posSystems.length === 0
            }
            renderHeading={() => <MonoHeading title="03 / Bar Profile" mono={mono} />}
          >
            <dl className="space-y-1">
              {hospitality.spiritsKnowledge !== "None" && <Row label="Spirits" value={hospitality.spiritsKnowledge} mono={mono} muted={muted} />}
              {hospitality.wineKnowledge !== "None" && <Row label="Wine" value={hospitality.wineKnowledge} mono={mono} muted={muted} />}
              {hospitality.serviceStyles.length > 0 && <Row label="Service" value={hospitality.serviceStyles.join(", ")} mono={mono} muted={muted} />}
              {hospitality.posSystems.length > 0 && <Row label="POS" value={hospitality.posSystems.join(", ")} mono={mono} muted={muted} />}
            </dl>
          </CvSection>

          <CvSection
            empty={hospitality.languages.length === 0}
            renderHeading={() => <MonoHeading title="04 / Languages" mono={mono} />}
          >
            <ul className="space-y-0.5">
              {hospitality.languages.map((l) => (
                <li key={l.name} className={TS.body.tw}>
                  {l.name} <span style={{ color: muted, fontFamily: mono }}>· {l.level}</span>
                </li>
              ))}
            </ul>
          </CvSection>
        </aside>

        <main className="space-y-8">
          <CvSection
            empty={experience.length === 0}
            renderHeading={() => <MonoHeading title="Experience" mono={mono} large />}
          >
            <div className="space-y-5">
              {experience.map((e) => (
                <div key={e.id} className="grid grid-cols-[110px_1fr] gap-4">
                  <p className={`pt-0.5 ${TS.entryMeta.tw}`} style={{ fontFamily: mono, color: muted }}>
                    {dateRange(e.startDate, e.endDate, e.current)}
                  </p>
                  <CvEntry
                    title={e.role}
                    meta={[e.venue, e.location].filter(Boolean).join(" — ")}
                    description={e.bullets ?? e.description}
                    tokens={entryTokens}
                  />
                </div>
              ))}
            </div>
          </CvSection>

          <CvSection
            empty={education.length === 0}
            renderHeading={() => <MonoHeading title="Education" mono={mono} large />}
          >
            <div className="space-y-3">
              {education.map((e) => (
                <div key={e.id} className="grid grid-cols-[110px_1fr] gap-4">
                  <p className={`pt-0.5 ${TS.entryMeta.tw}`} style={{ fontFamily: mono, color: muted }}>
                    {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                  </p>
                  <CvEntry
                    title={[e.degree, e.field].filter(Boolean).join(", ")}
                    meta={e.school}
                    tokens={entryTokens}
                  />
                </div>
              ))}
            </div>
          </CvSection>

          <CvSection
            empty={certifications.length === 0}
            renderHeading={() => <MonoHeading title="Certifications" mono={mono} large />}
          >
            <ul className="space-y-1">
              {certifications.map((c) => (
                <li key={c.id} className="grid grid-cols-[110px_1fr] gap-4">
                  <span className={TS.entryMeta.tw} style={{ fontFamily: mono, color: muted }}>{c.year}</span>
                  <span className={TS.body.tw}>
                    <span className="font-medium">{c.name}</span>
                    <span style={{ color: muted }}> — {c.issuer}</span>
                  </span>
                </li>
              ))}
            </ul>
          </CvSection>
        </main>
      </div>
    </div>
  );
}

function MonoHeading({ title, mono, large }: { title: string; mono: string; large?: boolean }) {
  return (
    <h2
      className={`mb-3 ${large ? TS.body.tw : TS.sectionHeader.tw} uppercase tracking-[0.3em]`}
      style={{ fontFamily: mono }}
    >
      {title}
    </h2>
  );
}

function Row({ label, value, mono, muted }: { label: string; value: string; mono: string; muted: string }) {
  return (
    <div className="grid grid-cols-[70px_1fr] gap-2">
      <dt className={`${TS.entryMeta.tw} uppercase`} style={{ fontFamily: mono, color: muted }}>{label}</dt>
      <dd className={TS.body.tw}>{value}</dd>
    </div>
  );
}
