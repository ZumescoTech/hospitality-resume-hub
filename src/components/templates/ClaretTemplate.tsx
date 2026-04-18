import { ResumeData } from "@/types/resume";
import { dateRange } from "./utils";

export function ClaretTemplate({ data }: { data: ResumeData }) {
  const { personal, summary, experience, education, skills, certifications, hospitality } = data;
  return (
    <div className="font-sans text-[11px] leading-relaxed text-[#1a1410]" style={{ background: "#fbf7f0" }}>
      <div className="border-b-4 border-[#3a1119] px-10 pb-6 pt-8">
        <div className="flex items-start gap-5">
          {personal.photo && (
            <img src={personal.photo} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-[#c9a55a]" />
          )}
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#3a1119]">
              {personal.fullName || "Your Name"}
            </h1>
            <p className="mt-0.5 text-sm uppercase tracking-[0.2em] text-[#c9a55a]">
              {personal.title || "Hospitality Professional"}
            </p>
            <p className="mt-2 text-[10.5px] text-[#5a4a3a]">
              {[personal.location, personal.email, personal.phone].filter(Boolean).join("  ·  ")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-8 px-10 py-7">
        <div className="col-span-2 space-y-6">
          {summary && (
            <Block title="Profile">
              <p>{summary}</p>
            </Block>
          )}
          {experience.length > 0 && (
            <Block title="Experience">
              <div className="space-y-4">
                {experience.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-[#3a1119]">{e.role}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#8a6f4a]">
                        {dateRange(e.startDate, e.endDate, e.current)}
                      </p>
                    </div>
                    <p className="italic text-[#5a4a3a]">
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
            <Block title="Education">
              <div className="space-y-3">
                {education.map((e) => (
                  <div key={e.id}>
                    <div className="flex items-baseline justify-between">
                      <p className="font-semibold">{e.degree}{e.field ? `, ${e.field}` : ""}</p>
                      <p className="text-[10px] uppercase tracking-wider text-[#8a6f4a]">
                        {[e.startDate, e.endDate].filter(Boolean).join(" — ")}
                      </p>
                    </div>
                    <p className="italic text-[#5a4a3a]">{e.school}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </div>

        <div className="space-y-6">
          {skills.length > 0 && (
            <Block title="Skills">
              <ul className="space-y-1">
                {skills.map((s) => <li key={s}>· {s}</li>)}
              </ul>
            </Block>
          )}
          {(hospitality.serviceStyles.length > 0 ||
            hospitality.posSystems.length > 0 ||
            hospitality.wineKnowledge !== "None") && (
            <Block title="Service Profile">
              {hospitality.wineKnowledge !== "None" && (
                <p><span className="font-semibold">Wine:</span> {hospitality.wineKnowledge}</p>
              )}
              {hospitality.spiritsKnowledge !== "None" && (
                <p><span className="font-semibold">Spirits:</span> {hospitality.spiritsKnowledge}</p>
              )}
              {hospitality.serviceStyles.length > 0 && (
                <p><span className="font-semibold">Service:</span> {hospitality.serviceStyles.join(", ")}</p>
              )}
              {hospitality.posSystems.length > 0 && (
                <p><span className="font-semibold">POS:</span> {hospitality.posSystems.join(", ")}</p>
              )}
              {hospitality.allergens && <p>· Allergen-trained</p>}
              {hospitality.foodSafety && <p>· {hospitality.foodSafety}</p>}
            </Block>
          )}
          {hospitality.languages.length > 0 && (
            <Block title="Languages">
              <ul className="space-y-1">
                {hospitality.languages.map((l) => (
                  <li key={l.name}>{l.name} <span className="text-[#8a6f4a]">— {l.level}</span></li>
                ))}
              </ul>
            </Block>
          )}
          {certifications.length > 0 && (
            <Block title="Certifications">
              <ul className="space-y-1">
                {certifications.map((c) => (
                  <li key={c.id}>
                    <span className="font-semibold">{c.name}</span>
                    <br />
                    <span className="text-[#8a6f4a]">{c.issuer} · {c.year}</span>
                  </li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-display text-xs font-bold uppercase tracking-[0.25em] text-[#3a1119]">
        {title}
      </h2>
      <div className="border-t border-[#c9a55a]/40 pt-2">{children}</div>
    </section>
  );
}
