import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

/**
 * Elegant Sommelier — deep burgundy header, gold rules, narrow serif body.
 */
export function CellarTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#241016";
  const cream = "#f6efe6";
  const accent = "#a0743a";
  const muted = "#6b5142";
  const serif = "Georgia, 'Times New Roman', serif";

  const entryTokens = { titleColor: ink, metaColor: muted, bodyColor: ink, metaItalic: true, datesRight: true };

  return (
    <div style={{ background: cream, color: ink, fontFamily: serif, fontSize: TS.body.rem, lineHeight: TS.body.lh }}>
      {/* Burgundy header band */}
      <header className="relative px-12 pb-12 pt-10" style={{ background: ink, color: cream }}>
        <div className="flex items-center gap-6">
          {personal.photo && (
            <img
              src={personal.photo}
              alt=""
              className="h-28 w-28 shrink-0 rounded-full object-cover"
              style={{ outline: `3px solid ${accent}`, outlineOffset: 3 }}
            />
          )}
          {/* min-w-0 prevents long names overflowing */}
          <div className="min-w-0 flex-1">
            <p className={`${TS.metaSmall.tw} uppercase tracking-[0.5em]`} style={{ color: accent }}>
              Sommelier · Wine Director
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-none tracking-tight">
              {personal.fullName || "Your Name"}
            </h1>
            <p className={`mt-2 italic ${TS.jobTitle.tw}`} style={{ color: "#d9c7a3" }}>
              {personal.title || "Hospitality Professional"}
            </p>
            <p className={`mt-3 ${TS.metaSmall.tw}`} style={{ color: "#cbb893" }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </header>

      {/* Cellar feature strip — only rendered when at least one column has data.
          pt-8 (32px) keeps label text 8px clear of the -mt-6 (24px) overlap zone.
          flex justify-center reflows to however many populated columns remain. */}
      {(() => {
        const pillars: { label: string; value: string }[] = [];
        if (hospitality.wineKnowledge !== "None") pillars.push({ label: "Wine", value: hospitality.wineKnowledge });
        if (hospitality.spiritsKnowledge !== "None") pillars.push({ label: "Spirits", value: hospitality.spiritsKnowledge });
        if (hospitality.languages.length > 0) pillars.push({ label: "Languages", value: hospitality.languages.map((l) => l.name).join(", ") });
        if (pillars.length === 0) return null;
        return (
          <div
            className="mx-12 -mt-6 flex justify-center gap-8 rounded-sm px-6 pt-8 pb-4"
            style={{ background: cream, border: `1px solid ${accent}` }}
          >
            {pillars.map((p) => (
              <Pillar key={p.label} label={p.label} value={p.value} accent={accent} muted={muted} />
            ))}
          </div>
        );
      })()}

      <div className="grid grid-cols-3 gap-10 px-12 py-8">
        <main className="col-span-2 space-y-6">
          <CvSection
            empty={!summary}
            renderHeading={() => <Block title="Profile" accent={accent} />}
          >
            <p className={`${TS.body.tw} first-letter:float-left first-letter:mr-2 first-letter:font-bold first-letter:text-3xl first-letter:leading-[0.85]`} style={{ color: ink }}>
              {summary}
            </p>
          </CvSection>

          <CvSection
            empty={experience.length === 0}
            renderHeading={() => <Block title="Experience" accent={accent} />}
          >
            <div className="space-y-4">
              {experience.map((e) => (
                <CvEntry
                  key={e.id}
                  title={e.role}
                  meta={[e.venue, e.location].filter(Boolean).join(" · ")}
                  dates={dateRange(e.startDate, e.endDate, e.current)}
                  description={e.bullets ?? e.description}
                  tokens={entryTokens}
                />
              ))}
            </div>
          </CvSection>

          <CvSection
            empty={education.length === 0}
            renderHeading={() => <Block title="Education" accent={accent} />}
          >
            <div className="space-y-2">
              {education.map((e) => (
                <CvEntry
                  key={e.id}
                  title={[e.degree, e.field].filter(Boolean).join(", ")}
                  meta={e.school}
                  dates={[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                  tokens={{ ...entryTokens, datesRight: false }}
                />
              ))}
            </div>
          </CvSection>
        </main>

        <aside className="space-y-6">
          <CvSection
            empty={hospitality.serviceStyles.length === 0}
            renderHeading={() => <Block title="Service" accent={accent} small />}
          >
            <p className={TS.body.tw}>{hospitality.serviceStyles.join(", ")}</p>
          </CvSection>

          <CvSection
            empty={hospitality.posSystems.length === 0}
            renderHeading={() => <Block title="POS Systems" accent={accent} small />}
          >
            <p className={TS.body.tw}>{hospitality.posSystems.join(", ")}</p>
          </CvSection>

          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <Block title="Skills" accent={accent} small />}
          >
            <ul className="space-y-1">
              {skills.map((s) => <li key={s} className={TS.body.tw}>· {s}</li>)}
            </ul>
          </CvSection>

          <CvSection
            empty={hospitality.languages.length === 0}
            renderHeading={() => <Block title="Languages" accent={accent} small />}
          >
            <ul className="space-y-1">
              {hospitality.languages.map((l) => (
                <li key={l.name} className={TS.body.tw}>
                  {l.name}<span style={{ color: muted }}> — {l.level}</span>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={certifications.length === 0}
            renderHeading={() => <Block title="Certifications" accent={accent} small />}
          >
            <ul className="space-y-1.5">
              {certifications.map((c) => (
                <li key={c.id}>
                  <p className={TS.entryTitle.tw}>{c.name}</p>
                  <p className={TS.entryMeta.tw} style={{ color: muted }}>{c.issuer} · {c.year}</p>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={!hospitality.foodSafety && !hospitality.allergens}
            renderHeading={() => <Block title="Compliance" accent={accent} small />}
          >
            {hospitality.foodSafety && <p className={TS.body.tw}>{hospitality.foodSafety}</p>}
            {hospitality.allergens && <p className={TS.body.tw}>Allergen-trained</p>}
          </CvSection>
        </aside>
      </div>
    </div>
  );
}

function Block({ title, accent, small }: { title: string; accent: string; small?: boolean }) {
  return (
    <section>
      <h2 className={`mb-2 ${small ? TS.entryMeta.tw : TS.sectionHeader.tw} font-bold uppercase tracking-[0.3em]`} style={{ color: accent }}>
        {title}
      </h2>
      <div className="border-t pt-2" style={{ borderColor: accent + "55" }} />
    </section>
  );
}

function Pillar({ label, value, accent, muted }: { label: string; value: string; accent: string; muted: string }) {
  return (
    <div className="text-center">
      <p className={`${TS.metaSmall.tw} uppercase tracking-[0.3em]`} style={{ color: muted }}>{label}</p>
      <p className={`mt-1 font-semibold ${TS.body.tw}`} style={{ color: accent }}>{value}</p>
    </div>
  );
}
