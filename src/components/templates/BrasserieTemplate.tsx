import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

export function BrasserieTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  const ink = "#14322a";
  const accent = "#d2b377";
  const cream = "#f6f1e4";

  return (
    <div className="grid grid-cols-3 font-sans text-[11px] leading-relaxed" style={{ background: "#fbf8f0", color: ink }}>
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
        <h1 className="font-display text-2xl font-bold leading-tight" style={{ color: cream }}>
          {personal.fullName || "Your Name"}
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.22em]" style={{ color: accent }}>
          {personal.title || "Hospitality Pro"}
        </p>

        <div className="mt-6 space-y-1 text-[10.5px]">
          {personal.email && <p>{personal.email}</p>}
          {personal.phone && <p>{personal.phone}</p>}
          {personal.location && <p>{personal.location}</p>}
        </div>

        {skills.length > 0 && (
          <SideBlock accent={accent} title="Skills">
            <ul className="space-y-0.5">{skills.map((s) => <li key={s}>· {s}</li>)}</ul>
          </SideBlock>
        )}

        {hospitality.languages.length > 0 && (
          <SideBlock accent={accent} title="Languages">
            <ul className="space-y-0.5">
              {hospitality.languages.map((l) => (
                <li key={l.name}>{l.name} <span style={{ color: accent }}>· {l.level}</span></li>
              ))}
            </ul>
          </SideBlock>
        )}

        <SideBlock accent={accent} title="Hospitality">
          {hospitality.wineKnowledge !== "None" && <p>Wine: {hospitality.wineKnowledge}</p>}
          {hospitality.spiritsKnowledge !== "None" && <p>Spirits: {hospitality.spiritsKnowledge}</p>}
          {hospitality.serviceStyles.length > 0 && <p>Service: {hospitality.serviceStyles.join(", ")}</p>}
          {hospitality.posSystems.length > 0 && <p>POS: {hospitality.posSystems.join(", ")}</p>}
          {hospitality.foodSafety && <p>{hospitality.foodSafety}</p>}
          {hospitality.allergens && <p>Allergen-trained</p>}
        </SideBlock>
      </aside>

      {/* Main */}
      <main className="col-span-2 space-y-5 px-8 py-8">
        {summary && (
          <section>
            <h2 className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.25em]">
              Profile
            </h2>
            <p>{summary}</p>
          </section>
        )}

        {experience.length > 0 && (
          <section>
            <h2 className="mb-2 font-display text-[10px] font-bold uppercase tracking-[0.25em]">
              Experience
            </h2>
            <div className="space-y-3">
              {experience.map((e) => (
                <div key={e.id}>
                  <p className="font-semibold">{e.role}</p>
                  <p className="italic" style={{ color: "#5a4a3a" }}>
                    {e.venue}{e.location ? ` · ${e.location}` : ""} · {dateRange(e.startDate, e.endDate, e.current)}
                  </p>
                  {e.description && <p className="mt-0.5 whitespace-pre-line">{e.description}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {education.length > 0 && (
          <section>
            <h2 className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.25em]">
              Education
            </h2>
            {education.map((e) => (
              <div key={e.id} className="mb-1">
                <p className="font-semibold">{e.degree}{e.field ? `, ${e.field}` : ""}</p>
                <p style={{ color: "#5a4a3a" }}>
                  {e.school} · {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                </p>
              </div>
            ))}
          </section>
        )}

        {certifications.length > 0 && (
          <section>
            <h2 className="mb-1 font-display text-[10px] font-bold uppercase tracking-[0.25em]">
              Certifications
            </h2>
            <ul className="space-y-0.5">
              {certifications.map((c) => (
                <li key={c.id}>
                  <span className="font-semibold">{c.name}</span> — {c.issuer}, {c.year}
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </div>
  );
}

function SideBlock({ title, accent, children }: { title: string; accent: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: accent }}>
        {title}
      </h3>
      <div>{children}</div>
    </section>
  );
}
