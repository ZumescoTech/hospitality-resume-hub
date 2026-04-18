import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

interface Theme {
  bg: string;
  ink: string;
  accent: string;
  muted: string;
  font?: string;
}

export function SimpleTemplate({ data, theme, label }: { data: ResumeData; theme: Theme; label?: string }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  return (
    <div
      className="font-sans text-[11px] leading-relaxed"
      style={{ background: theme.bg, color: theme.ink, fontFamily: theme.font }}
    >
      <header className="px-10 pb-5 pt-8" style={{ borderBottom: `1px solid ${theme.accent}` }}>
        <div className="flex items-center gap-5">
          {personal.photo && (
            <img src={personal.photo} alt="" className="h-16 w-16 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.ink, letterSpacing: "-0.01em" }}>
              {personal.fullName || "Your Name"}
            </h1>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: theme.accent }}>
              {personal.title || label || "Hospitality Professional"}
            </p>
            <p className="mt-1 text-[10.5px]" style={{ color: theme.muted }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </header>

      <div className="space-y-5 px-10 py-6">
        {summary && <Para theme={theme} title="Profile">{summary}</Para>}

        {experience.length > 0 && (
          <Para theme={theme} title="Experience">
            <div className="space-y-3">
              {experience.map((e) => (
                <div key={e.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-semibold">{e.role} · <span className="font-normal italic">{e.venue}</span></p>
                    <p className="text-[10px]" style={{ color: theme.muted }}>
                      {dateRange(e.startDate, e.endDate, e.current)}
                    </p>
                  </div>
                  {e.description && <p className="mt-0.5 whitespace-pre-line">{e.description}</p>}
                </div>
              ))}
            </div>
          </Para>
        )}

        <div className="grid grid-cols-2 gap-6">
          {education.length > 0 && (
            <Para theme={theme} title="Education">
              {education.map((e) => (
                <div key={e.id} className="mb-1.5">
                  <p className="font-semibold">{e.degree}</p>
                  <p style={{ color: theme.muted }}>
                    {e.school} · {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                  </p>
                </div>
              ))}
            </Para>
          )}
          {skills.length > 0 && (
            <Para theme={theme} title="Skills">
              <p>{skills.join("  ·  ")}</p>
            </Para>
          )}
        </div>

        {(hospitality.serviceStyles.length > 0 ||
          hospitality.posSystems.length > 0 ||
          hospitality.wineKnowledge !== "None" ||
          hospitality.languages.length > 0) && (
          <Para theme={theme} title="Hospitality Profile">
            <div className="grid grid-cols-2 gap-2">
              {hospitality.wineKnowledge !== "None" && (
                <p><b>Wine:</b> {hospitality.wineKnowledge}</p>
              )}
              {hospitality.spiritsKnowledge !== "None" && (
                <p><b>Spirits:</b> {hospitality.spiritsKnowledge}</p>
              )}
              {hospitality.serviceStyles.length > 0 && (
                <p><b>Service:</b> {hospitality.serviceStyles.join(", ")}</p>
              )}
              {hospitality.posSystems.length > 0 && (
                <p><b>POS:</b> {hospitality.posSystems.join(", ")}</p>
              )}
              {hospitality.languages.length > 0 && (
                <p className="col-span-2">
                  <b>Languages:</b>{" "}
                  {hospitality.languages.map((l) => `${l.name} (${l.level})`).join(", ")}
                </p>
              )}
              {hospitality.foodSafety && <p><b>Food safety:</b> {hospitality.foodSafety}</p>}
              {hospitality.allergens && <p><b>·</b> Allergen-trained</p>}
            </div>
          </Para>
        )}

        {certifications.length > 0 && (
          <Para theme={theme} title="Certifications">
            <ul className="grid grid-cols-2 gap-1">
              {certifications.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.name}</span>
                  <span style={{ color: theme.muted }}> — {c.issuer}, {c.year}</span>
                </li>
              ))}
            </ul>
          </Para>
        )}
      </div>
    </div>
  );
}

function Para({
  theme,
  title,
  children,
}: {
  theme: Theme;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: theme.accent }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}
