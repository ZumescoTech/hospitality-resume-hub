// parseCvForBuilder.ts
// Server function: extract CV text → AI router → structured ResumeData.
// Uses AiRouter (Groq primary → Gemini fallback) via the shared provider layer.
//
// T5.2: Hybrid extraction behind HYBRID_EXTRACTION=true feature flag.
//   - Always run deterministic regex extraction first.
//   - If the CV has high-confidence signals (email + phone + ≥2 date ranges),
//     skip the AI extraction call and return a skeleton with regex-filled fields.
//   - Otherwise run AI extraction and overlay the regex results on top.
//   - AI path is never deleted; flag defaults OFF.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ResumeData } from "@/types/resume";
import { createRouter } from "@/lib/ai/router";
import {
  extractFieldsDeterministically,
  overlayDeterministicExtract,
  parseCvLocally,
} from "@/lib/cvExtractDeterministic";
import { uid } from "@/lib/utils";

const ParseCvSchema = z.object({ cvText: z.string().min(50) });
const EnrichSchema = z.object({
  resume: z.unknown(),
  cvText: z.string().min(50),
});

/** Testable inner parse used by parseCvForBuilder and gated import enrichment. */
export async function runParseCvForBuilder(cvText: string): Promise<ResumeData> {
  const det = extractFieldsDeterministically(cvText);
  const hybridEnabled = process.env.HYBRID_EXTRACTION === "true";

  if (hybridEnabled && det.skipAi) {
    console.log("[parse-cv] hybrid: skipping AI extraction (high-confidence signals)");
    const result = parseCvLocally(cvText);
    return {
      ...result,
      experience: result.experience.map((e) => ({ ...e, id: e.id || uid() })),
      education: result.education.map((e) => ({ ...e, id: e.id || uid() })),
      certifications: result.certifications.map((c) => ({ ...c, id: c.id || uid() })),
    };
  }

  const router = await createRouter({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    WORKERS_AI_ENABLED: process.env.WORKERS_AI_ENABLED,
  });

  const aiResult = await router.extract(cvText);
  return overlayDeterministicExtract(aiResult, det);
}

export const parseCvForBuilder = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: unknown }): Promise<ResumeData> => {
    const { cvText } = ParseCvSchema.parse(ctx.data);
    return runParseCvForBuilder(cvText);
  },
);

/**
 * Checker→builder enrichment. IMPORT_AI_ENRICH defaults OFF: returns the
 * local parse unchanged and never constructs a provider.
 */
export const enrichImportedCv = createServerFn({ method: "POST" }).handler(
  async (ctx: { data: unknown }): Promise<ResumeData> => {
    const parsed = EnrichSchema.parse(ctx.data);
    const { enrichImportedResume, isImportAiEnrichEnabled } =
      await import("@/lib/enrich-imported-resume");
    return enrichImportedResume(parsed.resume as ResumeData, parsed.cvText, {
      enabled: isImportAiEnrichEnabled(),
      extract: runParseCvForBuilder,
    });
  },
);
