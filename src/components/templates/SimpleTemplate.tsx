import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

interface Theme {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  font?: string;
}

export function SimpleTemplate({ data, theme, label }: { data: ResumeData; theme: Theme; label?: string }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;

  const entryTokens = {
    titleColor: theme.ink,
    metaColor: theme.muted,
    bodyColor: theme.ink,
    metaItalic: true,
    datesRight: true,
  };

  return (
    <div
      className="font-sans"
      style={{ background: theme.bg, color: theme.ink, fontFamily: theme.font, fontSize: TS.body.rem, lineHeight: TS.body.lh }}
    >
      <header className="px-10 pb-5 pt-8" style={{ borderBottom: `1px solid ${theme.accent}` }}>
        {/* min-w-0 on inner div prevents long names overflowing into photo */}
        <div className="flex items-center gap-5">
          {personal.photo && (
            <img src={personal.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold" style={{ color: theme.ink, letterSpacing: "-0.01em" }}>
              {personal.fullName || "Your Name"}
            </h1>
            <p className={`${TS.jobTitle.tw} uppercase tracking-[0.18em]`} style={{ color: theme.accent }}>
              {personal.title || label || "Hospitality Professional"}
            </p>
            <p className={`mt-1 ${TS.metaSmall.tw}`} style={{ color: theme.muted }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-10 py-6">
        <CvSection
          empty={!summary}
          renderHeading={() => <Heading title="Profile" accent={theme.accent} />}
        >
          <p className={TS.body.tw}>{summary}</p>
        </CvSection>

        <CvSection
          empty={experience.length === 0}
          renderHeading={() => <Heading title="Experience" accent={theme.accent} />}
        >
          <div className="space-y-3">
            {experience.map((e) => (
              <CvEntry
                key={e.id}
                title={<>{e.role}{e.venue ? <span className="font-normal italic"> · {e.venue}</span> : null}</>}
                dates={dateRange(e.startDate, e.endDate, e.current)}
                meta={e.location}
                description={e.bullets ?? e.description}
                tokens={entryTokens}
              />
            ))}
          </div>
        </CvSection>

        <div className="grid grid-cols-2 gap-6">
          <CvSection
            empty={education.length === 0}
            renderHeading={() => <Heading title="Education" accent={theme.accent} />}
          >
            {education.map((e) => (
              <CvEntry
                key={e.id}
                title={e.degree}
                meta={e.school}
                dates={[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                tokens={{ ...entryTokens, datesRight: false }}
                className="mb-1.5"
              />
            ))}
          </CvSection>

          <CvSection
            empty={skills.length === 0}
            renderHeading={() => <Heading title="Skills" accent={theme.accent} />}
          >
            <p className={TS.body.tw}>{skills.join("  ·  ")}</p>
          </CvSection>
        </div>

        <CvSection
          empty={
            hospitality.serviceStyles.length === 0 &&
            hospitality.posSystems.length === 0 &&
            hospitality.wineKnowledge === "None" &&
            hospitality.languages.length === 0
          }
          renderHeading={() => <Heading title="Hospitality Profile" accent={theme.accent} />}
        >
          <div className="grid grid-cols-2 gap-2">
            {hospitality.wineKnowledge !== "None" && (
              <p className={TS.body.tw}><b>Wine:</b> {hospitality.wineKnowledge}</p>
            )}
            {hospitality.spiritsKnowledge !== "None" && (
              <p className={TS.body.tw}><b>Spirits:</b> {hospitality.spiritsKnowledge}</p>
            )}
            {hospitality.serviceStyles.length > 0 && (
              <p className={TS.body.tw}><b>Service:</b> {hospitality.serviceStyles.join(", ")}</p>
            )}
            {hospitality.posSystems.length > 0 && (
              <p className={TS.body.tw}><b>POS:</b> {hospitality.posSystems.join(", ")}</p>
            )}
            {hospitality.languages.length > 0 && (
              <p className={`${TS.body.tw} col-span-2`}>
                <b>Languages:</b>{" "}
                {hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}
              </p>
            )}
            {hospitality.foodSafety && <p className={TS.body.tw}><b>Food safety:</b> {hospitality.foodSafety}</p>}
            {hospitality.allergens && <p className={TS.body.tw}>Allergen-trained</p>}
          </div>
        </CvSection>

        <CvSection
          empty={certifications.length === 0}
          renderHeading={() => <Heading title="Certifications" accent={theme.accent} />}
        >
          <ul className="grid grid-cols-2 gap-1">
            {certifications.map((c) => (
              <li key={c.id} className={TS.body.tw}>
                <span className="font-semibold">{c.name}</span>
                <span style={{ color: theme.muted }}> — {c.issuer}, {c.year}</span>
              </li>
            ))}
          </ul>
        </CvSection>
      </div>
    </div>
  );
}

function Heading({ title, accent }: { title: string; accent: string }) {
  return (
    <h2
      className={`mb-1.5 ${TS.sectionHeader.tw}`}
      style={{ color: accent }}
    >
      {title}
    </h2>
  );
}
