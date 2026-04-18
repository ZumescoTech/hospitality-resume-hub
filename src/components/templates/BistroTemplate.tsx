import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

/**
 * Classic Professional — tailored for waiters & front-of-house.
 * Centered serif header, single column, generous spacing,
 * traditional section rules. Profile image is a circular badge
 * above the name.
 */
export function BistroTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#2a2218";
  const accent = "#a07b3c";
  const muted = "#7a6a52";
  const rule = "#d8cdb6";

  return (
    <div
      className="text-[11px] leading-relaxed"
      style={{ background: "#fbf6ec", color: ink, fontFamily: "Georgia, 'Times New Roman', serif" }}
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
        <p
          className="mt-1 text-[11px] uppercase tracking-[0.32em]"
          style={{ color: accent }}
        >
          {personal.title || "Front of House Professional"}
        </p>
        <div
          className="mx-auto mt-4 h-px w-24"
          style={{ background: accent }}
        />
        <p className="mt-3 text-[10.5px]" style={{ color: muted }}>
          {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
        </p>
      </header>

      <div className="space-y-6 px-12 pb-10">
        {summary && (
          <Block accent={accent} rule={rule} title="Profile" centered>
            <p className="text-center italic">{summary}</p>
          </Block>
        )}

        {experience.length > 0 && (
          <Block accent={accent} rule={rule} title="Experience">
            <div className="space-y-4">
              {experience.map((e) => (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-bold" style={{ color: ink }}>
                      {e.role}
                    </p>
                    <p className="text-[10px] tracking-wider" style={{ color: muted }}>
                      {dateRange(e.startDate, e.endDate, e.current)}
                    </p>
                  </div>
                  <p className="italic" style={{ color: muted }}>
                    {e.venue}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                  {e.description && <p className="mt-1 whitespace-pre-line">{e.description}</p>}
                </div>
              ))}
            </div>
          </Block>
        )}

        {education.length > 0 && (
          <Block accent={accent} rule={rule} title="Education">
            <div className="space-y-2">
              {education.map((e) => (
                <div key={e.id} className="flex items-baseline justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {e.degree}
                      {e.field ? `, ${e.field}` : ""}
                    </p>
                    <p className="italic" style={{ color: muted }}>
                      {e.school}
                    </p>
                  </div>
                  <p className="text-[10px]" style={{ color: muted }}>
                    {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                  </p>
                </div>
              ))}
            </div>
          </Block>
        )}

        {skills.length > 0 && (
          <Block accent={accent} rule={rule} title="Skills" centered>
            <p className="text-center">{skills.join("   ·   ")}</p>
          </Block>
        )}

        {(hospitality.serviceStyles.length > 0 ||
          hospitality.posSystems.length > 0 ||
          hospitality.wineKnowledge !== "None" ||
          hospitality.languages.length > 0) && (
          <Block accent={accent} rule={rule} title="Service Profile">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              {hospitality.serviceStyles.length > 0 && (
                <p>
                  <b>Service:</b> {hospitality.serviceStyles.join(", ")}
                </p>
              )}
              {hospitality.posSystems.length > 0 && (
                <p>
                  <b>POS:</b> {hospitality.posSystems.join(", ")}
                </p>
              )}
              {hospitality.wineKnowledge !== "None" && (
                <p>
                  <b>Wine:</b> {hospitality.wineKnowledge}
                </p>
              )}
              {hospitality.spiritsKnowledge !== "None" && (
                <p>
                  <b>Spirits:</b> {hospitality.spiritsKnowledge}
                </p>
              )}
              {hospitality.languages.length > 0 && (
                <p className="col-span-2">
                  <b>Languages:</b>{" "}
                  {hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}
                </p>
              )}
              {hospitality.foodSafety && (
                <p>
                  <b>Food safety:</b> {hospitality.foodSafety}
                </p>
              )}
              {hospitality.allergens && <p>Allergen-trained</p>}
            </div>
          </Block>
        )}

        {certifications.length > 0 && (
          <Block accent={accent} rule={rule} title="Certifications">
            <ul className="space-y-1">
              {certifications.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3">
                  <span>
                    <span className="font-semibold">{c.name}</span>
                    <span style={{ color: muted }}> — {c.issuer}</span>
                  </span>
                  <span className="text-[10px]" style={{ color: muted }}>
                    {c.year}
                  </span>
                </li>
              ))}
            </ul>
          </Block>
        )}
      </div>
    </div>
  );
}

function Block({
  title,
  accent,
  rule,
  centered,
  children,
}: {
  title: string;
  accent: string;
  rule: string;
  centered?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className={`mb-2 flex items-center gap-3 ${centered ? "justify-center" : ""}`}>
        <span className="h-px flex-1" style={{ background: rule }} />
        <h2
          className="text-[10px] font-bold uppercase tracking-[0.32em]"
          style={{ color: accent }}
        >
          {title}
        </h2>
        <span className="h-px flex-1" style={{ background: rule }} />
      </div>
      <div>{children}</div>
    </section>
  );
}
