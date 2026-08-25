import type { ResumeData } from "@/types/resume";
import type { BuilderSectionId, CheckerAudit, CheckerFix } from "@/types/checker-audit";
import { evaluateFix, evaluateChecklist } from "@/lib/checker-audit";

interface Props {
  resume: ResumeData;
  onOpenSection: (id: BuilderSectionId) => void;
  onAuditChange: (audit: CheckerAudit) => void;
}

export function ImprovementChecklist({ resume, onOpenSection, onAuditChange }: Props) {
  const audit = resume.checkerAudit;
  if (!audit || audit.fixes.length === 0) return null;

  const { completed, total } = evaluateChecklist(audit, resume);

  function handleToggleManual(fix: CheckerFix) {
    if (fix.kind !== "generic") return;
    const nextFixes = audit!.fixes.map((f) =>
      f.id === fix.id ? { ...f, completedManually: !f.completedManually } : f,
    );
    onAuditChange({ ...audit!, fixes: nextFixes });
  }

  return (
    <section
      role="region"
      aria-label="Improvement checklist"
      style={{
        margin: "12px",
        borderRadius: 12,
        border: "1px solid #d9efe8",
        background: "#f3fbf8",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          marginBottom: 10,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Improvement checklist</h2>
        <p style={{ margin: 0, fontSize: 12, color: "#4b635c" }}>
          {completed} of {total} complete
        </p>
      </div>
      <ul
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {audit.fixes.slice(0, 5).map((fix) => {
          const done = evaluateFix(fix, resume);
          return (
            <li
              key={fix.id}
              style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                background: "#fff",
                borderRadius: 8,
                border: "1px solid #e4eeea",
                padding: "10px 12px",
              }}
            >
              {fix.kind === "generic" ? (
                <input
                  type="checkbox"
                  checked={Boolean(fix.completedManually)}
                  onChange={() => handleToggleManual(fix)}
                  aria-label={`Mark ${fix.title} complete`}
                  style={{ marginTop: 3, width: 16, height: 16 }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{ marginTop: 2, color: done ? "#1d9e75" : "#9aa8a3", fontSize: 14 }}
                >
                  {done ? "✓" : "○"}
                </span>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <button
                  type="button"
                  onClick={() => onOpenSection(fix.targetSection)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    font: "inherit",
                    minHeight: 44,
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      fontSize: 13,
                      fontWeight: 600,
                      color: done ? "#4b635c" : "#12241f",
                    }}
                  >
                    {fix.title}
                  </span>
                  <span style={{ display: "block", fontSize: 12, color: "#5c6f69", marginTop: 2 }}>
                    {fix.explanation}
                  </span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
