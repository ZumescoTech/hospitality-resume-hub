function formatDate(d: string) {
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
  // Same start and end (e.g. a single-year qualification) reads as a range
  // when written "2021 — 2021"; collapse it to one value.
  if (start && end && start === end) return start;
  return [start, end].filter(Boolean).join(" — ");
}

