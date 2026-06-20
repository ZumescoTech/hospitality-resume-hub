import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";
import { CvSection } from "@/lib/cv-templates/CvSection";
import { CvEntry } from "@/lib/cv-templates/CvEntry";
import { TS } from "@/lib/cv-templates/type-scale";

export function BrasserieTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#14322a";
  const accent = "#d2b377";
  const cream = "#f6f1e4";

  const entryTokens = { titleColor: ink, metaColor: "#5a4a3a", bodyColor: ink, metaItalic: true, datesRight: false };

  return (
    <div className="grid grid-cols-3 font-sans" style={{ background: "#fbf8f0", color: ink, fontSize: TS.body.rem, lineHeight: TS.body.lh }}>
      {/* Sidebar */}
      <aside className="col-span-1 px-6 py-8" style={{ background: ink, color: cream }}>
        {personal.photo && (
          <img
            src={personal.photo}
            alt=""
            className="mb-5 h-24 w-24 rounded-full object-cover"
            style={{ outline: `2px solid ${accent}` }}
          />
        )}
        <h1 className="text-2xl font-bold leading-tight" style={{ color: cream }}>
          {personal.fullName || "Your Name"}
        </h1>
        <p className={`mt-1 ${TS.jobTitle.tw} uppercase tracking-[0.22em]`} style={{ color: accent }}>
          {personal.title || "Hospitality Pro"}
        </p>

        <div className={`mt-6 space-y-1 ${TS.metaSmall.tw}`}>
          {personal.email && <p>{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {personal.location && <p>{personal.location}</p>}
        </div>

        <CvSection
          empty={skills.length === 0}
          renderHeading={() => <SideHeading title="Skills" accent={accent} />}
          className="mt-6"
        >
          <ul className="space-y-0.5">
            {skills.map((s) => <li key={s} className={TS.body.tw}>· {s}</li>)}
          </ul>
        </CvSection>

        <CvSection
          empty={hospitality.languages.length === 0}
          renderHeading={() => <SideHeading title="Languages" accent={accent} />}
          className="mt-6"
        >
          <ul className="space-y-0.5">
            {hospitality.languages.map((l) => (
              <li key={l.name} className={TS.body.tw}>
                {l.name} <span style={{ color: accent }}>· {l.level}</span>
              </li>
            ))}
          </ul>
        </CvSection>

        <section className="mt-6">
          <SideHeading title="Hospitality" accent={accent} />
          {hospitality.wineKnowledge !== "None" && <p className={TS.body.tw}>Wine: {hospitality.wineKnowledge}</p>}
          {hospitality.spiritsKnowledge !== "None" && <p className={TS.body.tw}>Spirits: {hospitality.spiritsKnowledge}</p>}
          {hospitality.serviceStyles.length > 0 && <p className={TS.body.tw}>Service: {hospitality.serviceStyles.join(", ")}</p>}
          {hospitality.posSystems.length > 0 && <p className={TS.body.tw}>POS: {hospitality.posSystems.join(", ")}</p>}
          {hospitality.foodSafety && <p className={TS.body.tw}>{hospitality.foodSafety}</p>}
          {hospitality.allergens && <p className={TS.body.tw}>Allergen-trained</p>}
        </section>
      </aside>

      {/* Main */}
      <main className="col-span-2 space-y-5 px-8 py-8">
        <CvSection
          empty={!summary}
          renderHeading={() => <MainHeading title="Profile" />}
        >
          <p className={TS.body.tw}>{summary}</p>
        </CvSection>

        <CvSection
          empty={experience.length === 0}
          renderHeading={() => <MainHeading title="Experience" />}
        >
          <div className="space-y-3">
            {experience.map((e) => (
              <CvEntry
                key={e.id}
                title={e.role}
                meta={[e.venue, e.location, dateRange(e.startDate, e.endDate, e.current)].filter(Boolean).join(" · ")}
                description={e.bullets ?? e.description}
                tokens={entryTokens}
              />
            ))}
          </div>
        </CvSection>

        <CvSection
          empty={education.length === 0}
          renderHeading={() => <MainHeading title="Education" />}
        >
          {education.map((e) => (
            <CvEntry
              key={e.id}
              title={[e.degree, e.field].filter(Boolean).join(", ")}
              meta={[e.school, [e.startDate, e.endDate].filter(Boolean).join(" — ")].filter(Boolean).join(" · ")}
              tokens={entryTokens}
              className="mb-1"
            />
          ))}
        </CvSection>

        <CvSection
          empty={certifications.length === 0}
          renderHeading={() => <MainHeading title="Certifications" />}
        >
          <ul className="space-y-0.5">
            {certifications.map((c) => (
              <li key={c.id} className={TS.body.tw}>
                <span className="font-semibold">{c.name}</span> — {c.issuer}, {c.year}
              </li>
            ))}
          </ul>
        </CvSection>
      </main>
    </div>
  );
}

function SideHeading({ title, accent }: { title: string; accent: string }) {
  return (
    <h3 className={`mb-1.5 ${TS.sectionHeader.tw}`} style={{ color: accent }}>{title}</h3>
  );
}

function MainHeading({ title }: { title: string }) {
  return (
    <h2 className={`mb-1 ${TS.sectionHeader.tw}`}>{title}</h2>
  );
}
