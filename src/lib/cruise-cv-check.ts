import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  buildCvCheckPrompt,
  computeCvScore,
  type CruiseRolesData,
  type CvScoreResult,
} from '@/lib/cruiseCvRubric';
import { runDeterministicChecks, scoreKeywordAlignment } from '@/lib/cvDeterministicChecks';
import { createRouter } from '@/lib/ai/router';
import { ProviderError } from '@/lib/ai/provider';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

const CvCheckSchema = z.object({
  cvText: z.string().min(50, 'CV text must be at least 50 characters'),
  roleSlug: z.string().min(1, 'Role is required'),
  jobDescription: z.string().optional(),
});

const SaveLeadSchema = z.object({
  whatsapp_number: z.string().min(5, 'WhatsApp number is required'),
  country_code: z.string().length(2, 'Country code must be 2 letters'),
  roleSlug: z.string(),
  overallScore: z.number(),
  tier: z.string(),
  topFixes: z.array(z.string()),
  opted_in: z.boolean(),
});

export type CvCheckInput = z.infer<typeof CvCheckSchema>;
export type SaveLeadInput = z.infer<typeof SaveLeadSchema>;

// ─── CV check ─────────────────────────────────────────────────────────────────
// Uses AiRouter (Groq primary → Gemini fallback).  ProviderError{exhausted}
// propagates to the client so the UI can show a graceful retry message.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkCruiseCv = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<CvScoreResult> => {
  const parsed = CvCheckSchema.parse(ctx.data as CvCheckInput);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);

  // 1. Deterministic signals
  const signals = runDeterministicChecks(parsed.cvText);

  // 2. Keyword alignment
  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(
    parsed.cvText,
    role.keywords,
    parsed.jobDescription,
  );

  // 3. Build prompt
  const { system, user } = buildCvCheckPrompt({
    cvText: parsed.cvText,
    role,
    signals,
    matchedKeywords,
    missingKeywords,
    matchRatio,
    jobDescription: parsed.jobDescription,
  });

  // 4. Call via router (Groq → Gemini on 429/5xx/bad_json)
  const router = createRouter({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  const llmParsed = await router.analyze({ system, user });

  // 5. Compute final score deterministically — LLM output never changes the score directly
  return computeCvScore(llmParsed, matchedKeywords, missingKeywords);
});

// ─── Save WhatsApp lead to webhook ────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveCvLead = createServerFn({ method: 'POST' }).handler(async (ctx: any) => {
  const parsed = SaveLeadSchema.parse(ctx.data as SaveLeadInput);

  const webhookUrl = process.env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL;
  if (!webhookUrl) return { ok: true };

  const roleName = rolesData.roles.find((r) => r.slug === parsed.roleSlug)?.role ?? parsed.roleSlug;

  const payload = JSON.stringify({
    whatsapp_number: parsed.whatsapp_number,
    country_code: parsed.country_code,
    role: roleName,
    role_slug: parsed.roleSlug,
    score: parsed.overallScore,
    tier: parsed.tier,
    top_fixes: parsed.topFixes.join(' | '),
    opted_in: parsed.opted_in,
    created_at: new Date().toISOString(),
  });

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(payload).length),
    },
    body: payload,
  });

  return { ok: res.ok };
});

export function getRoleOptions() {
  return rolesData.roles.map((r) => ({ slug: r.slug, label: r.role }));
}
