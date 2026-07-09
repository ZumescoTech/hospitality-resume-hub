/**
 * cv-utils — isEmpty helpers for each CV section type.
 *
 * Returns true only when a section has real content worth showing on a CV.
 * An "empty" section is: undefined, null, [], or an array of blank objects.
 * Matches the exact field names used in src/types/resume.ts.
 */

import type { Experience, Education, Certification, Hospitality } from "@/types/resume";

export function hasExperience(experience: Experience[]): boolean {
  if (!experience || experience.length === 0) return false;
  return experience.some(
    (e) => e.role.trim().length > 0 || e.venue.trim().length > 0
  );
}

export function hasEducation(education: Education[]): boolean {
  if (!education || education.length === 0) return false;
  return education.some(
    (e) => e.degree.trim().length > 0 || e.school.trim().length > 0
  );
}

export function hasSkills(skills: string[]): boolean {
  if (!skills || skills.length === 0) return false;
  return skills.some((s) => s.trim().length > 0);
}

export function hasCertifications(certifications: Certification[]): boolean {
  if (!certifications || certifications.length === 0) return false;
  return certifications.some((c) => c.name.trim().length > 0);
}

function hasLanguages(hospitality: Hospitality): boolean {
  if (!hospitality?.languages || hospitality.languages.length === 0) return false;
  return hospitality.languages.some((l) => l.name.trim().length > 0);
}

export function hasHospitalityProfile(hospitality: Hospitality): boolean {
  if (!hospitality) return false;
  return (
    hospitality.serviceStyles.length > 0 ||
    hospitality.posSystems.length > 0 ||
    hospitality.wineKnowledge !== "None" ||
    hospitality.spiritsKnowledge !== "None" ||
    hasLanguages(hospitality) ||
    hospitality.allergens ||
    (!!hospitality.foodSafety && hospitality.foodSafety.trim().length > 0)
  );
}

/** Returns only the languages that have a non-blank name. */
export function filledLanguages(hospitality: Hospitality) {
  if (!hospitality?.languages) return [];
  return hospitality.languages.filter((l) => l.name.trim().length > 0);
}
