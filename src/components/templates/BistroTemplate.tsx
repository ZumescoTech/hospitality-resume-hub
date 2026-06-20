import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

/**
 * Classic Professional — tailored for waiters & front-of-house.
 * Centered serif header, single column, traditional section rules.
 */
export function BistroTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#2a2218";
  const accent = "#a07b3c";
  const muted = "#7a6a52";
  const rule = "#d8cdb6";

  const entryTokens = {
    titleColor: ink,
    metaColor: muted,
    bodyColor: ink,
    metaItalic: true,
    datesRight: true,
  };

  return (
    <div
      style={{ background: "#fbf6ec", color: ink, fontFamily: "Georgia, 'Times New Roman', serif", fontSize: TS.body.rem, lineHeight: TS.body.lh }}
    >
      <header className="px-12 pb-6 pt-10 text-center">
        {personal.photo && (
          <img
            src={personal.photo}
            alt=""
            className="mx-auto mb-4 h-24 w-24 rounded-full object-cover"
            style={{ border: `2px solid ${accent}` }}
          />
        )}
        <h1 className="text-3xl font-bold tracking-wide" style={{ color: ink }}>
          {personal.fullName || "Your Name"}
        </h1>
        <p className={`mt-1 ${TS.jobTitle.tw} uppercase tracking-[0.32em]`} style={{ color: accent }}>
          {personal.title || "Front of House Professional"}
        </p>
        <div className="mx-auto mt-4 h-px w-24" style={{ background: accent }} />
        <p className={`mt-3 ${TS.metaSmall.tw}`} style={{ color: muted }}>
          {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
        </p>
      </header>

      <div className="space-y-6 px-12 pb-10">
        <CvSection
          empty={!summary}
          renderHeading={() => <Rule title="Profile" accent={accent} rule={rule} centered />}
        >
          <p className={`text-center italic ${TS.body.tw}`}>{summary}</p>
        </CvSection>

        <CvSection
          empty={experience.length === 0}
          renderHeading={() => <Rule title="Experience" accent={accent} rule={rule} />}
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
          renderHeading={() => <Rule title="Education" accent={accent} rule={rule} />}
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

        <CvSection
          empty={skills.length === 0}
          renderHeading={() => <Rule title="Skills" accent={accent} rule={rule} centered />}
        >
          <p className={`text-center ${TS.body.tw}`}>{skills.join("   ·   ")}</p>
        </CvSection>

        <CvSection
          empty={
            hospitality.serviceStyles.length === 0 &&
            hospitality.posSystems.length === 0 &&
            hospitality.wineKnowledge === "None" &&
            hospitality.languages.length === 0
          }
          renderHeading={() => <Rule title="Service Profile" accent={accent} rule={rule} />}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {hospitality.serviceStyles.length > 0 && (
              <p className={TS.body.tw}><b>Service:</b> {hospitality.serviceStyles.join(", ")}</p>
            )}
            {hospitality.posSystems.length > 0 && (
              <p className={TS.body.tw}><b>POS:</b> {hospitality.posSystems.join(", ")}</p>
            )}
            {hospitality.wineKnowledge !== "None" && (
              <p className={TS.body.tw}><b>Wine:</b> {hospitality.wineKnowledge}</p>
            )}
            {hospitality.spiritsKnowledge !== "None" && (
              <p className={TS.body.tw}><b>Spirits:</b> {hospitality.spiritsKnowledge}</p>
            )}
            {hospitality.languages.length > 0 && (
              <p className={`${TS.body.tw} col-span-2`}>
                <b>Languages:</b>{" "}
                {hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}
              </p>
            )}
            {hospitality.foodSafety && (
              <p className={TS.body.tw}><b>Food safety:</b> {hospitality.foodSafety}</p>
            )}
            {hospitality.allergens && <p className={TS.body.tw}>Allergen-trained</p>}
          </div>
        </CvSection>

        <CvSection
          empty={certifications.length === 0}
          renderHeading={() => <Rule title="Certifications" accent={accent} rule={rule} />}
        >
          <ul className="space-y-1">
            {certifications.map((c) => (
              <li key={c.id} className="flex items-baseline justify-between gap-3">
                <span className={TS.body.tw}>
                  <span className="font-semibold">{c.name}</span>
                  <span style={{ color: muted }}> — {c.issuer}</span>
                </span>
                <span className={TS.entryMeta.tw} style={{ color: muted }}>{c.year}</span>
              </li>
            ))}
          </ul>
        </CvSection>
      </div>
    </div>
  );
}

function Rule({
  title,
  accent,
  rule,
  centered,
}: {
  title: string;
  accent: string;
  rule: string;
  centered?: boolean;
}) {
  return (
    <div className={`mb-2 flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
      <span className="h-px flex-1" style={{ background: rule }} />
      <h2 className={TS.sectionHeader.tw} style={{ color: accent }}>{title}</h2>
      <span className="h-px flex-1" style={{ background: rule }} />
    </div>
  );
}
