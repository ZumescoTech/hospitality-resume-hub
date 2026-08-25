// Gated AI enrichment for checker → builder imports.
// Default OFF (IMPORT_AI_ENRICH !== 'true'): never calls a provider.
// When ON, fills only empty sections — local parse always wins on filled fields.

import type { Hospitality, ResumeData } from "@/types/resume";
import { emptyResume } from "@/types/resume";

export function isImportAiEnrichEnabled(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): boolean {
  return env.IMPORT_AI_ENRICH === "true";
}

function nonEmpty(value: string | undefined): boolean {
  return Boolean(value && value.trim().length > 0);
}

function defaultLanguagesOnly(langs: Hospitality["languages"]): boolean {
  return langs.length === 1 && langs[0].name === "English" && langs[0].level === "Fluent";
}

function mergeHospitality(local: Hospitality, ai: Hospitality): Hospitality {
  const pos = [...local.posSystems];
  for (const p of ai.posSystems) {
    if (!pos.some((x) => x.toLowerCase() === p.toLowerCase())) pos.push(p);
  }
  const styles = [...local.serviceStyles];
  for (const s of ai.serviceStyles) {
    if (!styles.some((x) => x.toLowerCase() === s.toLowerCase())) styles.push(s);
  }
  const langs =
    defaultLanguagesOnly(local.languages) && ai.languages.length > 0
      ? ai.languages
      : local.languages;
  return {
    serviceStyles: styles,
    posSystems: pos,
    wineKnowledge: local.wineKnowledge !== "None" ? local.wineKnowledge : ai.wineKnowledge,
    spiritsKnowledge:
      local.spiritsKnowledge !== "None" ? local.spiritsKnowledge : ai.spiritsKnowledge,
    languages: langs.length > 0 ? langs : emptyResume.hospitality.languages,
    allergens: local.allergens || ai.allergens,
    foodSafety: nonEmpty(local.foodSafety) ? local.foodSafety : ai.foodSafety,
  };
}

/**
 * Merge an AI extract into a local parse. Filled local sections are kept.
 */
export function mergeSparseAiExtract(local: ResumeData, ai: ResumeData): ResumeData {
  return {
    ...local,
    personal: {
      ...ai.personal,
      fullName: nonEmpty(local.personal.fullName) ? local.personal.fullName : ai.personal.fullName,
      title: nonEmpty(local.personal.title) ? local.personal.title : ai.personal.title,
      email: nonEmpty(local.personal.email) ? local.personal.email : ai.personal.email,
      phone: nonEmpty(local.personal.phone) ? local.personal.phone : ai.personal.phone,
      location: nonEmpty(local.personal.location) ? local.personal.location : ai.personal.location,
      links: (local.personal.links?.length ?? 0) > 0 ? local.personal.links : ai.personal.links,
      photo: undefined,
    },
    summary: nonEmpty(local.summary) ? local.summary : ai.summary,
    experience: local.experience.length > 0 ? local.experience : ai.experience,
    education: local.education.length > 0 ? local.education : ai.education,
    skills: local.skills.length > 0 ? local.skills : ai.skills,
    certifications: local.certifications.length > 0 ? local.certifications : ai.certifications,
    hospitality: mergeHospitality(local.hospitality ?? emptyResume.hospitality, ai.hospitality),
    checkerAudit: local.checkerAudit,
    targetRoleSlug: local.targetRoleSlug ?? ai.targetRoleSlug,
  };
}

export interface EnrichImportedResumeOptions {
  enabled: boolean;
  extract: (cvText: string) => Promise<ResumeData>;
}

export async function enrichImportedResume(
  local: ResumeData,
  cvText: string,
  options: EnrichImportedResumeOptions,
): Promise<ResumeData> {
  if (!options.enabled) return local;
  if (!cvText || cvText.trim().length < 50) return local;
  try {
    const ai = await options.extract(cvText);
    return mergeSparseAiExtract(local, ai);
  } catch {
    return local;
  }
}
