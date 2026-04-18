import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

/**
 * Modern Minimal — tailored for bartenders & mixologists.
 * Asymmetric two-column layout, monospace accents, square photo,
 * lots of whitespace, no decorative rules. Sharp and editorial.
 */
export function TokyoTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#111111";
  const muted = "#7a7a7a";
  const mono = "ui-monospace, SFMono-Regular, Menlo, monospace";

  return (
    <div className="text-[11px] leading-relaxed" style={{ background: "#ffffff", color: ink }}>
      <header className="grid grid-cols-[auto_1fr] items-end gap-6 px-12 pb-8 pt-12">
        {personal.photo ? (
          <img
            src={personal.photo}
            alt=""
            className="h-28 w-28 rounded-none object-cover grayscale"
          />
        ) : (
          <div className="h-28 w-28 bg-[#f1f1f1]" />
        )}
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em]" style={{ color: muted, fontFamily: mono }}>
            {personal.title || "Bartender · Mixologist"}
          </p>
          <h1 className="mt-2 text-5xl font-light leading-none tracking-tight">
            {personal.fullName || "Your Name"}
          </h1>
          <p className="mt-3 text-[10.5px]" style={{ fontFamily: mono, color: muted }}>
            {[personal.email, personal.phone, personal.location].filter(Boolean).join("   /   ")}
          </p>
        </div>
      </header>

      <div className="h-px w-full" style={{ background: "#111" }} />

      <div className="grid grid-cols-[1fr_2fr] gap-10 px-12 py-10">
        {/* Left rail — meta */}
        <aside className="space-y-7">
          {summary && (
            <Section title="01 / Profile" mono={mono}>
              <p>{summary}</p>
            </Section>
          )}

          {skills.length > 0 && (
            <Section title="02 / Skills" mono={mono}>
              <ul className="space-y-1">
                {skills.map((s) => (
                  <li key={s} className="flex gap-2">
                    <span style={{ color: muted, fontFamily: mono }}>—</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(hospitality.spiritsKnowledge !== "None" ||
            hospitality.wineKnowledge !== "None" ||
            hospitality.serviceStyles.length > 0 ||
            hospitality.posSystems.length > 0) && (
            <Section title="03 / Bar Profile" mono={mono}>
              <dl className="space-y-1">
                {hospitality.spiritsKnowledge !== "None" && (
                  <Row label="Spirits" value={hospitality.spiritsKnowledge} mono={mono} muted={muted} />
                )}
                {hospitality.wineKnowledge !== "None" && (
                  <Row label="Wine" value={hospitality.wineKnowledge} mono={mono} muted={muted} />
                )}
                {hospitality.serviceStyles.length > 0 && (
                  <Row label="Service" value={hospitality.serviceStyles.join(", ")} mono={mono} muted={muted} />
                )}
                {hospitality.posSystems.length > 0 && (
                  <Row label="POS" value={hospitality.posSystems.join(", ")} mono={mono} muted={muted} />
                )}
              </dl>
            </Section>
          )}

          {hospitality.languages.length > 0 && (
            <Section title="04 / Languages" mono={mono}>
              <ul className="space-y-0.5">
                {hospitality.languages.map((l) => (
                  <li key={l.name}>
                    {l.name} <span style={{ color: muted, fontFamily: mono }}>· {l.level}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </aside>

        {/* Right column — narrative */}
        <main className="space-y-8">
          {experience.length > 0 && (
            <Section title="Experience" mono={mono} large>
              <div className="space-y-5">
                {experience.map((e) => (
                  <div key={e.id} className="grid grid-cols-[110px_1fr] gap-4">
                    <p className="pt-0.5 text-[10px]" style={{ fontFamily: mono, color: muted }}>
                      {dateRange(e.startDate, e.endDate, e.current)}
                    </p>
                    <div>
                      <p className="text-[13px] font-medium">{e.role}</p>
                      <p style={{ color: muted }}>
                        {e.venue}
                        {e.location ? ` — ${e.location}` : ""}
                      </p>
                      {e.description && <p className="mt-1 whitespace-pre-line">{e.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {education.length > 0 && (
            <Section title="Education" mono={mono} large>
              <div className="space-y-3">
                {education.map((e) => (
                  <div key={e.id} className="grid grid-cols-[110px_1fr] gap-4">
                    <p className="pt-0.5 text-[10px]" style={{ fontFamily: mono, color: muted }}>
                      {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                    </p>
                    <div>
                      <p className="font-medium">
                        {e.degree}
                        {e.field ? `, ${e.field}` : ""}
                      </p>
                      <p style={{ color: muted }}>{e.school}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {certifications.length > 0 && (
            <Section title="Certifications" mono={mono} large>
              <ul className="space-y-1">
                {certifications.map((c) => (
                  <li key={c.id} className="grid grid-cols-[110px_1fr] gap-4">
                    <span className="text-[10px]" style={{ fontFamily: mono, color: muted }}>
                      {c.year}
                    </span>
                    <span>
                      <span className="font-medium">{c.name}</span>
                      <span style={{ color: muted }}> — {c.issuer}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </main>
      </div>
    </div>
  );
}

function Section({
  title,
  mono,
  children,
  large,
}: {
  title: string;
  mono: string;
  children: React.ReactNode;
  large?: boolean;
}) {
  return (
    <section>
      <h2
        className={`mb-3 ${large ? "text-[11px]" : "text-[10px]"} uppercase tracking-[0.3em]`}
        style={{ fontFamily: mono }}
      >
        {title}
      </h2>
      <div>{children}</div>
    </section>
  );
}

function Row({
  label,
  value,
  mono,
  muted,
}: {
  label: string;
  value: string;
  mono: string;
  muted: string;
}) {
  return (
    <div className="grid grid-cols-[70px_1fr] gap-2">
      <dt className="text-[10px] uppercase" style={{ fontFamily: mono, color: muted }}>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
