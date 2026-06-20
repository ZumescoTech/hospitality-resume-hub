import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

export function ClaretTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#1a1410";
  const accent = "#3a1119";
  const gold = "#c9a55a";
  const muted = "#5a4a3a";
  const mutedAlt = "#8a6f4a";

  const entryTokens = { titleColor: accent, metaColor: muted, bodyColor: ink, metaItalic: true, datesRight: true };

  return (
    <div style={{ background: "#fbf7f0", color: ink, fontSize: TS.body.rem, lineHeight: TS.body.lh }} className="font-sans">
      <div className="border-b-4 border-[#3a1119] px-10 pb-6 pt-8">
        <div className="flex items-start gap-5">
          {personal.photo && (
            <img src={personal.photo} alt="" className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-[#c9a55a]" />
          )}
          {/* min-w-0 prevents long name overflow */}
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: accent }}>
              {personal.fullName || "Your Name"}
            </h1>
            <p className={`mt-0.5 ${TS.jobTitle.tw} uppercase tracking-[0.2em]`} style={{ color: gold }}>
              {personal.title || "Hospitality Professional"}
            </p>
            <p className={`mt-2 ${TS.metaSmall.tw}`} style={{ color: muted }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 px-10 py-7">
        <div className="col-span-2 space-y-6">
          <CvSection
            empty={!summary}
            renderHeading={() => <Heading title="Profile" accent={accent} gold={gold} />}
          >
            <p className={TS.body.tw}>{summary}</p>
          </CvSection>

          <CvSection
            empty={experience.length === 0}
            renderHeading={() => <Heading title="Experience" accent={accent} gold={gold} />}
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
            renderHeading={() => <Heading title="Education" accent={accent} gold={gold} />}
          >
            <div className="space-y-3">
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
        </div>

        <div className="space-y-6">
          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <Heading title="Skills" accent={accent} gold={gold} />}
          >
            <ul className="space-y-1">
              {skills.map((s) => <li key={s} className={TS.body.tw}>· {s}</li>)}
            </ul>
          </CvSection>

          <CvSection
            empty={
              hospitality.serviceStyles.length === 0 &&
              hospitality.posSystems.length === 0 &&
              hospitality.wineKnowledge === "None"
            }
            renderHeading={() => <Heading title="Service Profile" accent={accent} gold={gold} />}
          >
            {hospitality.wineKnowledge !== "None" && (
              <p className={TS.body.tw}><span className="font-semibold">Wine:</span> {hospitality.wineKnowledge}</p>
            )}
            {hospitality.spiritsKnowledge !== "None" && (
              <p className={TS.body.tw}><span className="font-semibold">Spirits:</span> {hospitality.spiritsKnowledge}</p>
            )}
            {hospitality.serviceStyles.length > 0 && (
              <p className={TS.body.tw}><span className="font-semibold">Service:</span> {hospitality.serviceStyles.join(", ")}</p>
            )}
            {hospitality.posSystems.length > 0 && (
              <p className={TS.body.tw}><span className="font-semibold">POS:</span> {hospitality.posSystems.join(", ")}</p>
            )}
            {hospitality.allergens && <p className={TS.body.tw}>· Allergen-trained</p>}
            {hospitality.foodSafety && <p className={TS.body.tw}>· {hospitality.foodSafety}</p>}
          </CvSection>

          <CvSection
            empty={hospitality.languages.length === 0}
            renderHeading={() => <Heading title="Languages" accent={accent} gold={gold} />}
          >
            <ul className="space-y-1">
              {hospitality.languages.map((l) => (
                <li key={l.name} className={TS.body.tw}>
                  {l.name} <span style={{ color: mutedAlt }}>— {l.level}</span>
                </li>
              ))}
            </ul>
          </CvSection>

          <CvSection
            empty={certifications.length === 0}
            renderHeading={() => <Heading title="Certifications" accent={accent} gold={gold} />}
          >
            <ul className="space-y-1">
              {certifications.map((c) => (
                <li key={c.id}>
                  <span className={`${TS.entryTitle.tw} block`}>{c.name}</span>
                  <span className={TS.entryMeta.tw} style={{ color: mutedAlt }}>{c.issuer} · {c.year}</span>
                </li>
              ))}
            </ul>
          </CvSection>
        </div>
      </div>
    </div>
  );
}

function Heading({ title, accent, gold }: { title: string; accent: string; gold: string }) {
  return (
    <section>
      <h2 className={`mb-2 ${TS.sectionHeader.tw}`} style={{ color: accent }}>{title}</h2>
      <div className="border-t pt-2" style={{ borderColor: gold + "40" }} />
    </section>
  );
}
