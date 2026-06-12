import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

/**
 * Classic Professional — Clean two-column A4 layout.
 * Top: profile image + name + title + personal details.
 * Left column: professional summary + skills.
 * Right column: experience + education.
 */
export function ClassicTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills } = data;

  // Palette
  const ink = "#1a1a2e";
  const accent = "#2563eb"; // classic corporate blue
  const muted = "#64748b";
  const light = "#e2e8f0";
  const bg = "#ffffff";
  const sidebarBg = "#f1f5f9";

  return (
    <div
      className="relative text-[11px] leading-relaxed"
      style={{ background: bg, color: ink, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
    >
      {/* ── TOP HEADER ─────────────────────────────────────────── */}
      <header
        style={{ background: ink, color: "#fff" }}
        className="flex items-center gap-6 px-10 py-8"
      >
        {/* Profile photo */}
        {personal.photo ? (
          <img
            src={personal.photo}
            alt="Profile"
            className="h-24 w-24 shrink-0 rounded-full object-cover"
            style={{ border: `3px solid ${accent}` }}
          />
        ) : (
          <div
            className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full text-3xl font-bold"
            style={{ background: accent, color: "#fff" }}
          >
            {personal.fullName ? personal.fullName.charAt(0).toUpperCase() : "?"}
          </div>
        )}

        {/* Name + title */}
        <div className="min-w-0 flex-1">
          <h1
            className="text-[28px] font-bold leading-tight tracking-tight"
            style={{ color: "#fff" }}
          >
            {personal.fullName || "Your Name"}
          </h1>
          <p
            className="mt-1 text-[13px] font-light uppercase tracking-[0.2em]"
            style={{ color: accent }}
          >
            {personal.title || "Hospitality Professional"}
          </p>

          {/* Contact row */}
          <div
            className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-[10px]"
            style={{ color: "#cbd5e1" }}
          >
            {personal.email && (
              <span>✉ {personal.email}</span>
            )}
            {personal.phone && (
              <span>✆ {personal.phone}</span>
            )}
            {personal.location && (
              <span>⌖ {personal.location}</span>
            )}
            {personal.links?.map((l) => (
              <span key={l.label}>↗ {l.url}</span>
            ))}
          </div>
        </div>
      </header>

      {/* ── TWO-COLUMN BODY ────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: 900 }}>
        {/* LEFT COLUMN — summary + skills */}
        <aside
          className="w-[220px] shrink-0 space-y-6 px-7 py-8"
          style={{ background: sidebarBg, borderRight: `1px solid ${light}` }}
        >
          {/* Professional Summary */}
          {summary && (
            <section>
              <SectionHeading label="Summary" accent={accent} />
              <p
                className="mt-2 text-[10.5px] leading-[1.6]"
                style={{ color: muted }}
              >
                {summary}
              </p>
            </section>
          )}

          {/* Skills */}
          {skills.length > 0 && (
            <section>
              <SectionHeading label="Skills" accent={accent} />
              <ul className="mt-2 space-y-1.5">
                {skills.map((skill) => (
                  <li key={skill} className="flex items-center gap-2">
                    <span
                      className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ background: accent }}
                    />
                    <span style={{ color: ink }}>{skill}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Certifications (side panel) */}
          {data.certifications.length > 0 && (
            <section>
              <SectionHeading label="Certifications" accent={accent} />
              <ul className="mt-2 space-y-2">
                {data.certifications.map((c) => (
                  <li key={c.id}>
                    <p className="font-semibold leading-tight" style={{ color: ink }}>
                      {c.name}
                    </p>
                    <p className="text-[9.5px]" style={{ color: muted }}>
                      {c.issuer} · {c.year}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Hospitality profile */}
          {(data.hospitality.serviceStyles.length > 0 ||
            data.hospitality.posSystems.length > 0 ||
            data.hospitality.languages.length > 0) && (
            <section>
              <SectionHeading label="Hospitality" accent={accent} />
              <div className="mt-2 space-y-1.5 text-[10px]" style={{ color: muted }}>
                {data.hospitality.serviceStyles.length > 0 && (
                  <p>
                    <span className="font-semibold" style={{ color: ink }}>
                      Service:{" "}
                    </span>
                    {data.hospitality.serviceStyles.join(", ")}
                  </p>
                )}
                {data.hospitality.posSystems.length > 0 && (
                  <p>
                    <span className="font-semibold" style={{ color: ink }}>
                      POS:{" "}
                    </span>
                    {data.hospitality.posSystems.join(", ")}
                  </p>
                )}
                {data.hospitality.wineKnowledge !== "None" && (
                  <p>
                    <span className="font-semibold" style={{ color: ink }}>
                      Wine:{" "}
                    </span>
                    {data.hospitality.wineKnowledge}
                  </p>
                )}
                {data.hospitality.languages.length > 0 && (
                  <p>
                    <span className="font-semibold" style={{ color: ink }}>
                      Languages:{" "}
                    </span>
                    {data.hospitality.languages
                      .map((l) => `${l.name} (${l.level})`)
                      .join(", ")}
                  </p>
                )}
              </div>
            </section>
          )}
        </aside>

        {/* RIGHT COLUMN — experience + education */}
        <main className="min-w-0 flex-1 space-y-7 px-8 py-8">
          {/* Experience */}
          {experience.length > 0 && (
            <section>
              <SectionHeading label="Experience" accent={accent} underline />
              <div className="mt-4 space-y-5">
                {experience.map((e) => (
                  <div key={e.id} className="relative pl-4">
                    {/* Timeline dot */}
                    <span
                      className="absolute left-0 top-1.5 h-2 w-2 rounded-full"
                      style={{ background: accent }}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-bold text-[12px]" style={{ color: ink }}>
                        {e.role}
                      </p>
                      <p
                        className="text-[9.5px] font-medium uppercase tracking-wide"
                        style={{ color: accent }}
                      >
                        {dateRange(e.startDate, e.endDate, e.current)}
                      </p>
                    </div>
                    <p className="text-[10.5px]" style={{ color: muted }}>
                      {e.venue}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    {e.description && (
                      <p
                        className="mt-1 whitespace-pre-line text-[10.5px] leading-[1.6]"
                        style={{ color: ink }}
                      >
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {education.length > 0 && (
            <section>
              <SectionHeading label="Education" accent={accent} underline />
              <div className="mt-4 space-y-4">
                {education.map((e) => (
                  <div key={e.id} className="relative pl-4">
                    <span
                      className="absolute left-0 top-1.5 h-2 w-2 rounded-full"
                      style={{ background: accent }}
                    />
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-bold text-[12px]" style={{ color: ink }}>
                        {e.degree}
                        {e.field ? `, ${e.field}` : ""}
                      </p>
                      <p className="text-[9.5px]" style={{ color: muted }}>
                        {[e.startDate, e.endDate].filter(Boolean).join(" – ")}
                      </p>
                    </div>
                    <p className="text-[10.5px] italic" style={{ color: muted }}>
                      {e.school}
                    </p>
                    {e.description && (
                      <p
                        className="mt-1 text-[10.5px] leading-[1.6]"
                        style={{ color: ink }}
                      >
                        {e.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

/* ── helpers ─────────────────────────────────────────────────── */

function SectionHeading({
  label,
  accent,
  underline,
}: {
  label: string;
  accent: string;
  underline?: boolean;
}) {
  return (
    <div>
      <h2
        className="text-[10px] font-bold uppercase tracking-[0.28em]"
        style={{ color: accent }}
      >
        {label}
      </h2>
      {underline && (
        <div
          className="mt-1 h-0.5 w-8 rounded-full"
          style={{ background: accent }}
        />
      )}
    </div>
  );
}
