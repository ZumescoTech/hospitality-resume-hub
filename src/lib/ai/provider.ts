// provider.ts
// Shared AI provider interface, boundary schemas, and validation functions.
// Every adapter MUST use validateAnalysis / validateExtraction — no adapter
// is allowed to trust raw LLM text directly.

import { z } from 'zod';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';

// ─── Error type ───────────────────────────────────────────────────────────────

export type ProviderErrorKind = 'bad_json' | 'rate_limit' | 'server_error' | 'exhausted';

export class ProviderError extends Error {
  constructor(
    public readonly kind: ProviderErrorKind,
    message: string,
    public readonly provider?: string,
    public readonly cause?: unknown,
  ) {
    super(`[${provider ?? 'provider'}] ${kind}: ${message}`);
    this.name = 'ProviderError';
  }
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface AnalyzeInput {
  /** System prompt — pre-built by buildCvCheckPrompt(). */
  system: string;
  /** User message — pre-built by buildCvCheckPrompt(). */
  user: string;
  signal?: AbortSignal;
}

export interface AiProvider {
  readonly name: string;
  /** Score a CV against a role. Returns validated RawLlmResponse. */
  analyze(input: AnalyzeInput): Promise<RawLlmResponse>;
  /** Extract structured ResumeData from raw CV text. */
  extract(cvText: string, signal?: AbortSignal): Promise<ResumeData>;
}

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const rawCategorySchema = z.object({
  score: z.number().min(0).max(100),
  feedback: z.string(),
});

/** Schema for the raw JSON the LLM returns for analyze(). */
export const analysisResultSchema = z.object({
  keywordAlignment:       rawCategorySchema,
  experienceDepth:        rawCategorySchema,
  quantifiedAchievements: rawCategorySchema,
  qualifications:         rawCategorySchema,
  cruiseReadiness:        rawCategorySchema,
  atsParseability:        rawCategorySchema,
  summaryQuality:         rawCategorySchema,
  topFixes: z.array(z.string()).default([]),
});

const langLevel = z.enum(['Basic', 'Conversational', 'Fluent', 'Native']);

const hospitalitySchema = z.object({
  serviceStyles:    z.array(z.string()).optional().default([]),
  posSystems:       z.array(z.string()).optional().default([]),
  wineKnowledge:    z.enum(['None', 'Beginner', 'Intermediate', 'Advanced', 'Sommelier']).optional().default('None'),
  spiritsKnowledge: z.enum(['None', 'Beginner', 'Intermediate', 'Advanced', 'Mixologist']).optional().default('None'),
  languages:        z.array(z.object({ name: z.string(), level: langLevel })).optional().default([]),
  allergens:        z.boolean().optional().default(false),
  foodSafety:       z.string().optional(),
}).optional().default({
  serviceStyles: [], posSystems: [],
  wineKnowledge: 'None', spiritsKnowledge: 'None',
  languages: [], allergens: false,
});

/** Schema for the raw JSON the LLM returns for extract().
 *  IDs are absent (assigned by the application after parsing). */
export const resumeDataSchema = z.object({
  personal: z.object({
    fullName: z.string(),
    title:    z.string().optional().default(''),
    email:    z.string().optional().default(''),
    phone:    z.string().optional().default(''),
    location: z.string().optional().default(''),
    links:    z.array(z.object({ label: z.string(), url: z.string() })).optional().default([]),
  }),
  summary: z.string().optional().default(''),
  experience: z.array(z.object({
    role:        z.string(),
    venue:       z.string(),
    location:    z.string().optional().default(''),
    startDate:   z.string().optional().default(''),
    endDate:     z.string().optional().default(''),
    current:     z.boolean().optional().default(false),
    description: z.string().optional().default(''),
    bullets:     z.array(z.string()).optional().default([]),
  })).optional().default([]),
  education: z.array(z.object({
    school:    z.string(),
    degree:    z.string(),
    field:     z.string().optional().default(''),
    startDate: z.string().optional().default(''),
    endDate:   z.string().optional().default(''),
    bullets:   z.array(z.string()).optional().default([]),
  })).optional().default([]),
  skills:         z.array(z.string()).optional().default([]),
  certifications: z.array(z.object({
    name:   z.string(),
    issuer: z.string().optional().default(''),
    year:   z.string().optional().default(''),
    expiry: z.string().optional(),
  })).optional().default([]),
  hospitality: hospitalitySchema,
  templateId:  z.string().optional().default('vintage'),
  references:  z.string().optional(),
  targetJobDescription: z.string().optional(),
  targetRoleSlug:       z.string().optional(),
});

// ─── Fence stripping (shared by both validators) ──────────────────────────────

function stripFencesAndExtract(raw: string): string {
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  return match ? match[0] : cleaned;
}

// ─── Boundary validation functions ────────────────────────────────────────────

/**
 * Parse + Zod-validate the LLM's raw string for analyze().
 * Markdown fences are stripped (repaired).
 * Truncated JSON, wrong types, missing required fields => ProviderError{kind:'bad_json'}.
 */
export function validateAnalysis(raw: string, provider?: string): RawLlmResponse {
  try {
    const cleaned = stripFencesAndExtract(raw);
    const parsed = JSON.parse(cleaned);
    return analysisResultSchema.parse(parsed) as unknown as RawLlmResponse;
  } catch (err) {
    throw new ProviderError(
      'bad_json',
      err instanceof Error ? err.message : String(err),
      provider,
      err,
    );
  }
}

/**
 * Parse + Zod-validate the LLM's raw string for extract().
 * Same fence-stripping and error-mapping as validateAnalysis.
 * Returns raw LLM data (without application-assigned IDs on array items).
 */
export function validateExtraction(raw: string, provider?: string): z.infer<typeof resumeDataSchema> {
  try {
    const cleaned = stripFencesAndExtract(raw);
    const parsed = JSON.parse(cleaned);
    return resumeDataSchema.parse(parsed);
  } catch (err) {
    throw new ProviderError(
      'bad_json',
      err instanceof Error ? err.message : String(err),
      provider,
      err,
    );
  }
}
