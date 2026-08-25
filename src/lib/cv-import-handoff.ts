// Versioned one-time sessionStorage handoff from the CV checker to the builder.
// Data is consumed on first read and expires after 30 minutes.
// Runtime-validated with Zod — TypeScript types are not trusted for storage.

import { z } from "zod";
import type { ResumeData } from "@/types/resume";
import type { CheckerAudit } from "@/types/checker-audit";
import { emptyResume } from "@/types/resume";

export const HANDOFF_STORAGE_KEY = "zumesco:cv-import";
export const HANDOFF_SCHEMA_VERSION = 1;
export const HANDOFF_TTL_MS = 30 * 60 * 1000;

const KEY = HANDOFF_STORAGE_KEY;
const TTL_MS = HANDOFF_TTL_MS;

const confidenceSchema = z
  .object({
    level: z.enum(["High", "Medium", "Low"]),
    reasons: z.array(z.string()),
  })
  .optional();

const categorySchema = z.object({
  score: z.number(),
  weight: z.number(),
  feedback: z.string(),
});

const fixSchema = z.object({
  id: z.string(),
  title: z.string(),
  explanation: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  targetSection: z.enum([
    "personal",
    "experience",
    "education",
    "skills",
    "certifications",
    "hospitality",
  ]),
  kind: z.enum([
    "missing-contact",
    "missing-summary",
    "missing-quantified",
    "missing-cert",
    "missing-keyword",
    "generic",
  ]),
  certName: z.string().optional(),
  keyword: z.string().optional(),
  completedManually: z.boolean().optional(),
});

const auditSchema = z.object({
  overallScore: z.number(),
  tier: z.enum(["Strong", "Good", "Needs Work", "Major Gaps"]),
  confidence: confidenceSchema,
  categories: z.object({
    keywordAlignment: categorySchema,
    experienceDepth: categorySchema,
    quantifiedAchievements: categorySchema,
    qualifications: categorySchema,
    cruiseReadiness: categorySchema,
    atsParseability: categorySchema,
    summaryQuality: categorySchema,
  }),
  topFixes: z.array(z.string()),
  missingKeywords: z.array(z.string()),
  matchedKeywords: z.array(z.string()),
  deterministicFeedback: z.array(z.string()),
  fixes: z.array(fixSchema),
});

const resumeSchema = z
  .object({
    personal: z.object({
      fullName: z.string().optional().default(""),
      title: z.string().optional().default(""),
      email: z.string().optional().default(""),
      phone: z.string().optional().default(""),
      location: z.string().optional().default(""),
      links: z
        .array(z.object({ label: z.string(), url: z.string() }))
        .optional()
        .default([]),
    }),
    summary: z.string().optional().default(""),
    experience: z
      .array(
        z.object({
          id: z.string().optional().default(""),
          role: z.string(),
          venue: z.string(),
          location: z.string().optional().default(""),
          startDate: z.string().optional().default(""),
          endDate: z.string().optional().default(""),
          current: z.boolean().optional().default(false),
          description: z.string().optional().default(""),
          bullets: z.array(z.string()).optional(),
        }),
      )
      .optional()
      .default([]),
    education: z
      .array(
        z.object({
          id: z.string().optional().default(""),
          school: z.string(),
          degree: z.string(),
          field: z.string().optional(),
          startDate: z.string().optional().default(""),
          endDate: z.string().optional().default(""),
          description: z.string().optional(),
          bullets: z.array(z.string()).optional(),
        }),
      )
      .optional()
      .default([]),
    skills: z.array(z.string()).optional().default([]),
    certifications: z
      .array(
        z.object({
          id: z.string().optional().default(""),
          name: z.string(),
          issuer: z.string().optional().default(""),
          year: z.string().optional().default(""),
          expiry: z.string().optional(),
        }),
      )
      .optional()
      .default([]),
    hospitality: z
      .object({
        serviceStyles: z.array(z.string()).optional().default([]),
        posSystems: z.array(z.string()).optional().default([]),
        wineKnowledge: z
          .enum(["None", "Beginner", "Intermediate", "Advanced", "Sommelier"])
          .optional()
          .default("None"),
        spiritsKnowledge: z
          .enum(["None", "Beginner", "Intermediate", "Advanced", "Mixologist"])
          .optional()
          .default("None"),
        languages: z
          .array(
            z.object({
              name: z.string(),
              level: z.enum(["Basic", "Conversational", "Fluent", "Native"]),
            }),
          )
          .optional()
          .default([]),
        allergens: z.boolean().optional().default(false),
        foodSafety: z.string().optional().default(""),
      })
      .optional(),
    templateId: z.string().optional().default("vintage"),
    targetRoleSlug: z.string().optional(),
    references: z.string().optional(),
  })
  .passthrough();

const handoffSchema = z.object({
  schemaVersion: z.literal(HANDOFF_SCHEMA_VERSION),
  createdAt: z.number(),
  expiresAt: z.number(),
  roleSlug: z.string().optional(),
  resume: resumeSchema,
  audit: auditSchema,
  sourceText: z.string().optional(),
});

export interface SaveCvImportInput {
  resume: ResumeData;
  roleSlug?: string;
  audit: CheckerAudit;
  /** Extracted plain text only — never the uploaded File. Used for gated AI enrich. */
  sourceText?: string;
}

export interface CheckerHandoff {
  schemaVersion: typeof HANDOFF_SCHEMA_VERSION;
  createdAt: number;
  expiresAt: number;
  roleSlug?: string;
  resume: ResumeData;
  audit: CheckerAudit;
  sourceText?: string;
}

/** @deprecated Use CheckerHandoff. Kept so older imports type-check during the transition. */
export interface CvImportResult {
  data: ResumeData;
  roleSlug?: string;
}

function toResume(parsed: z.infer<typeof resumeSchema>): ResumeData {
  return {
    ...emptyResume,
    personal: {
      ...emptyResume.personal,
      fullName: parsed.personal.fullName,
      title: parsed.personal.title,
      email: parsed.personal.email,
      phone: parsed.personal.phone,
      location: parsed.personal.location,
      links: parsed.personal.links,
      photo: undefined,
    },
    summary: parsed.summary,
    experience: parsed.experience.map((e) => ({
      id: e.id || "",
      role: e.role,
      venue: e.venue,
      location: e.location,
      startDate: e.startDate,
      endDate: e.endDate,
      current: e.current,
      description: e.description,
      bullets: e.bullets,
    })),
    education: parsed.education.map((e) => ({
      id: e.id || "",
      school: e.school,
      degree: e.degree,
      field: e.field,
      startDate: e.startDate,
      endDate: e.endDate,
      description: e.description,
      bullets: e.bullets,
    })),
    skills: parsed.skills,
    certifications: parsed.certifications.map((c) => ({
      id: c.id || "",
      name: c.name,
      issuer: c.issuer,
      year: c.year,
      expiry: c.expiry,
    })),
    templateId: parsed.templateId,
    targetRoleSlug: parsed.targetRoleSlug,
    references: parsed.references,
    hospitality: parsed.hospitality
      ? {
          serviceStyles: parsed.hospitality.serviceStyles,
          posSystems: parsed.hospitality.posSystems,
          wineKnowledge: parsed.hospitality.wineKnowledge,
          spiritsKnowledge: parsed.hospitality.spiritsKnowledge,
          languages:
            parsed.hospitality.languages.length > 0
              ? parsed.hospitality.languages
              : emptyResume.hospitality.languages,
          allergens: parsed.hospitality.allergens,
          foodSafety: parsed.hospitality.foodSafety,
        }
      : emptyResume.hospitality,
  };
}

export function saveCvImport(input: SaveCvImportInput, options?: { now?: number }): void {
  const now = options?.now ?? Date.now();
  const payload: CheckerHandoff = {
    schemaVersion: HANDOFF_SCHEMA_VERSION,
    createdAt: now,
    expiresAt: now + TTL_MS,
    roleSlug: input.roleSlug,
    resume: {
      ...input.resume,
      personal: { ...input.resume.personal, photo: undefined },
    },
    audit: input.audit,
    sourceText: input.sourceText,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable (private browsing quota exceeded etc.) — fail silently
  }
}

function readAndRemove(): string | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw == null) return null;
    sessionStorage.removeItem(KEY);
    return raw;
  } catch {
    return null;
  }
}

export function consumeCvImport(options?: { now?: number }): CheckerHandoff | null {
  const raw = readAndRemove();
  if (raw == null) return null;
  try {
    const json: unknown = JSON.parse(raw);
    const parsed = handoffSchema.safeParse(json);
    if (!parsed.success) return null;
    const now = options?.now ?? Date.now();
    if (now > parsed.data.expiresAt) return null;
    return {
      schemaVersion: parsed.data.schemaVersion,
      createdAt: parsed.data.createdAt,
      expiresAt: parsed.data.expiresAt,
      roleSlug: parsed.data.roleSlug,
      resume: toResume(parsed.data.resume),
      audit: parsed.data.audit,
      sourceText: parsed.data.sourceText,
    };
  } catch {
    return null;
  }
}

export function clearCvImport(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
