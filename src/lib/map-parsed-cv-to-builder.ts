// map-parsed-cv-to-builder.ts
// Ensures every experience/education/certification entry has a stable id
// before the data is loaded into the builder form.
// parseCvForBuilder already assigns ids, but we re-stamp them here so this
// function is safe to call on any ResumeData (including partial/test fixtures).

import type { ResumeData } from '@/types/resume';

export function mapParsedCvToBuilderForm(parsed: ResumeData): ResumeData {
  return {
    ...parsed,
    experience: parsed.experience.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
    })),
    education: parsed.education.map((e) => ({
      ...e,
      id: e.id || crypto.randomUUID(),
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
