// merged-call.ts
// Single-prompt mode that returns both {analysis, resumeData} in one LLM call.
// Gated behind env flag MERGED_CALL=true (default: off).
//
// Used in cruise-cv-check.ts only when MERGED_CALL is enabled and a role is
// provided (the extract call needs the CV text; the analyze call needs the prompt).
//
// Schema: { "analysis": {...7 categories...}, "resumeData": {...} }

import { z } from 'zod';
import { analysisResultSchema, resumeDataSchema, ProviderError } from './provider';
import type { AiProvider } from './provider';
import type { RawLlmResponse } from '@/lib/cruiseCvRubric';
import type { ResumeData } from '@/types/resume';
import { CV_EXTRACT_SYSTEM_PROMPT } from './extract-prompt';
import { uid } from '@/lib/utils';

// ─── Schema ───────────────────────────────────────────────────────────────────

export const mergedResultSchema = z.object({
  analysis: analysisResultSchema,
  resumeData: resumeDataSchema,
});

export type MergedResult = {
  analysis: RawLlmResponse;
  resumeData: ResumeData;
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildMergedPrompts(
  analyzeSystem: string,
  analyzeUser: string,
  cvText: string,
): { system: string; user: string } {
  const system = `${analyzeSystem}

---

Additionally, extract structured CV data using these rules:

${CV_EXTRACT_SYSTEM_PROMPT}

---

IMPORTANT: Return a single JSON object with EXACTLY this top-level shape:
{
  "analysis": { ...your 7-category scoring response... },
  "resumeData": { ...your CV extraction response... }
}

No other keys. No markdown fences. No commentary outside the JSON.`;

  const user = `${analyzeUser}

---

CV TEXT FOR EXTRACTION (same CV as above):
"""
${cvText.slice(0, 6000)}
"""`;

  return { system, user };
}

// ─── Validation ───────────────────────────────────────────────────────────────

function applyIds(raw: z.infer<typeof resumeDataSchema>): ResumeData {
  return {
    ...(raw as unknown as ResumeData),
    experience:     raw.experience.map((e) => ({ ...e, id: uid() })),
    education:      raw.education.map((e) => ({ ...e, id: uid() })),
    certifications: raw.certifications.map((c) => ({ ...c, id: uid() })),
    templateId: raw.templateId ?? 'vintage',
  };
}

export function validateMergedResponse(raw: string, provider?: string): MergedResult {
  try {
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('No JSON object found');
    const parsed = JSON.parse(match[0]);
    const result = mergedResultSchema.parse(parsed);
    return {
      analysis: result.analysis as unknown as RawLlmResponse,
      resumeData: applyIds(result.resumeData),
    };
  } catch (err) {
    throw new ProviderError(
      'bad_json',
      err instanceof Error ? err.message : String(err),
      provider,
      err,
    );
  }
}

// ─── Execution ────────────────────────────────────────────────────────────────

export async function runMergedCall(
  provider: AiProvider,
  analyzeSystem: string,
  analyzeUser: string,
  cvText: string,
): Promise<MergedResult> {
  const { system, user } = buildMergedPrompts(analyzeSystem, analyzeUser, cvText);
  // callRaw returns the raw text without schema validation, so we can apply
  // the merged schema (analysis + resumeData) ourselves.
  const raw = await provider.callRaw({ system, user });
  return validateMergedResponse(raw, provider.name);
}
