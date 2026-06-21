// map-parsed-cv-to-builder.ts
// Normalises parseCvForBuilder output into the shape the builder form expects,
// and ensures every entry has a stable id before data is loaded into form state.

import type { ResumeData } from '@/types/resume';

/**
 * Normalise a date string for <input type="month"> (expects "YYYY-MM").
 * The parser emits "YYYY" for year-only dates — pad to "YYYY-01" so the
 * month input renders the value rather than silently showing nothing.
 */
function normalizeMonthDate(date: string): string {
  if (!date) return '';
  return /^\d{4}$/.test(date) ? `${date}-01` : date;
}

export function mapParsedCvToBuilderForm(parsed: ResumeData): ResumeData {
  return {
    ...parsed,
    experience: parsed.experience.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
      // Parser populates `bullets: string[]` and leaves `description: ''`.
      // The Highlights textarea reads `description`, so join bullets here.
      // Clear `bullets` afterwards so templates always read from `description`
      // and the user's subsequent edits are never overridden by stale bullets.
      description: e.description || (e.bullets?.join('\n') ?? ''),
      bullets: undefined,
      // <input type="month"> needs "YYYY-MM"; parser may emit "YYYY" for year-only.
      startDate: normalizeMonthDate(e.startDate),
      // Keep endDate empty when current=true; normalise otherwise.
      endDate: e.current ? '' : normalizeMonthDate(e.endDate),
    })),
    education: parsed.education.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
      // Education date inputs are plain text (placeholder "2018") — no normalisation needed.
    })),
    certifications: parsed.certifications.map((c) => ({
      ...c,
      id: c.id || crypto.randomUUID(),
    })),
    // Never carry a photo across — the parser doesn't produce one and we
    // don't want a stale data URL from a previous session leaking in.
    personal: {
      ...parsed.personal,
      photo: undefined,
    },
  };
}
