import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

/**
 * Elegant Sommelier — tailored for wine-focused roles.
 * Deep burgundy header band with portrait, gold rules,
 * narrow serif body. Wine, spirits and languages are
 * promoted to a featured "Cellar" panel under the header.
 */
export function CellarTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#241016";
  const cream = "#f6efe6";
  const accent = "#a0743a";
  const muted = "#6b5142";
  const serif = "Georgia, 'Times New Roman', serif";

  return (
    <div className="text-[11px] leading-relaxed" style={{ background: cream, color: ink, fontFamily: serif }}>
      {/* Burgundy header band */}
      <header
        className="relative px-12 pb-12 pt-10"
        style={{ background: ink, color: cream }}
      >
        <div className="flex items-center gap-6">
          {personal.photo && (
            <img
              src={personal.photo}
              alt=""
              className="h-28 w-28 rounded-full object-cover"
              style={{ outline: `3px solid ${accent}`, outlineOffset: 3 }}
            />
          )}
          <div className="flex-1">
            <p
              className="text-[10px] uppercase tracking-[0.5em]"
              style={{ color: accent }}
            >
              Sommelier · Wine Director
            </p>
            <h1 className="mt-2 text-4xl font-bold leading-none tracking-tight">
              {personal.fullName || "Your Name"}
            </h1>
            <p className="mt-2 italic" style={{ color: "#d9c7a3" }}>
              {personal.title || "Hospitality Professional"}
            </p>
            <p className="mt-3 text-[10.5px]" style={{ color: "#cbb893" }}>
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </header>

      {/* Cellar feature strip */}
      {(hospitality.wineKnowledge !== "None" ||
        hospitality.spiritsKnowledge !== "None" ||
        hospitality.languages.length > 0) && (
        <div
          className="mx-12 -mt-6 grid grid-cols-3 gap-4 rounded-sm px-6 py-4"
          style={{ background: cream, border: `1px solid ${accent}` }}
        >
          <Pillar label="Wine" value={hospitality.wineKnowledge !== "None" ? hospitality.wineKnowledge : "—"} accent={accent} muted={muted} />
          <Pillar label="Spirits" value={hospitality.spiritsKnowledge !== "None" ? hospitality.spiritsKnowledge : "—"} accent={accent} muted={muted} />
          <Pillar
            label="Languages"
            value={hospitality.languages.length > 0 ? hospitality.languages.map((l) => l.name).join(", ") : "—"}
            accent={accent}
            muted={muted}
          />
        </div>
      )}

      <div className="grid grid-cols-3 gap-10 px-12 py-8">
        <main className="col-span-2 space-y-6">
          {summary && (
            <Block title="Profile" accent={accent}>
              <p className="text-[11.5px] leading-[1.7] first-letter:float-left first-letter:mr-2 first-letter:font-bold first-letter:text-3xl first-letter:leading-[0.85]" style={{ color: ink }}>
                {summary}
              </p>
            </Block>
          )}

          {experience.length > 0 && (
            <Block title="Experience" accent={accent}>
              <div className="space-y-4">
                {experience.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-bold" style={{ color: ink }}>
                        {e.role}
                      </p>
                      <p className="text-[10px] uppercase tracking-[0.18em]" style={{ color: accent }}>
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
            <Block title="Education" accent={accent}>
              <div className="space-y-2">
                {education.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">
                        {e.degree}
                        {e.field ? `, ${e.field}` : ""}
                      </p>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: accent }}>
                        {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    <p className="italic" style={{ color: muted }}>
                      {e.school}
                    </p>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </main>

        <aside className="space-y-6">
          {hospitality.serviceStyles.length > 0 && (
            <Block title="Service" accent={accent} small>
              <p>{hospitality.serviceStyles.join(", ")}</p>
            </Block>
          )}

          {hospitality.posSystems.length > 0 && (
            <Block title="POS Systems" accent={accent} small>
              <p>{hospitality.posSystems.join(", ")}</p>
            </Block>
          )}

          {skills.length > 0 && (
            <Block title="Skills" accent={accent} small>
              <ul className="space-y-1">
                {skills.map((s) => (
                  <li key={s}>· {s}</li>
                ))}
              </ul>
            </Block>
          )}

          {hospitality.languages.length > 0 && (
            <Block title="Languages" accent={accent} small>
              <ul className="space-y-1">
                {hospitality.languages.map((l) => (
                  <li key={l.name}>
                    {l.name}
                    <span style={{ color: muted }}> — {l.level}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {certifications.length > 0 && (
            <Block title="Certifications" accent={accent} small>
              <ul className="space-y-1.5">
                {certifications.map((c) => (
                  <li key={c.id}>
                    <p className="font-semibold">{c.name}</p>
                    <p style={{ color: muted }}>
                      {c.issuer} · {c.year}
                    </p>
                  </li>
                ))}
              </ul>
            </Block>
          )}

          {(hospitality.foodSafety || hospitality.allergens) && (
            <Block title="Compliance" accent={accent} small>
              {hospitality.foodSafety && <p>{hospitality.foodSafety}</p>}
              {hospitality.allergens && <p>Allergen-trained</p>}
            </Block>
          )}
        </aside>
      </div>
    </div>
  );
}

function Block({
  title,
  accent,
  small,
  children,
}: {
  title: string;
  accent: string;
  small?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className={`mb-2 ${small ? "text-[9px]" : "text-[10px]"} font-bold uppercase tracking-[0.3em]`}
        style={{ color: accent }}
      >
        {title}
      </h2>
      <div className="border-t pt-2" style={{ borderColor: accent + "55" }}>
        {children}
      </div>
    </section>
  );
}

function Pillar({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent: string;
  muted: string;
}) {
  return (
    <div className="text-center">
      <p className="text-[9px] uppercase tracking-[0.3em]" style={{ color: muted }}>
        {label}
      </p>
      <p className="mt-1 font-semibold" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
