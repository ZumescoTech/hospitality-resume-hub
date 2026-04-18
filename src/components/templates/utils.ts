import { ResumeData } from "@/types/resume";

export function formatDate(d: string) {
  if (!d) return "";
  // Accept YYYY or YYYY-MM
  const [y, m] = d.split("-");
  if (!m) return y;
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function dateRange(s: string, e: string, current?: boolean) {
  const start = formatDate(s);
  const end = current ? "Present" : formatDate(e);
  if (!start && !end) return "";
  return [start, end].filter(Boolean).join(" — ");
}

export function hasAny(d: ResumeData) {
  return (
    d.personal.fullName ||
    d.summary ||
    d.experience.length ||
    d.education.length ||
    d.skills.length ||
    d.certifications.length
  );
}
