import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  buildCvCheckPrompt,
  computeCvScore,
  type CruiseRolesData,
  type CvScoreResult,
  type CvCheckOutcome,
} from '@/lib/cruiseCvRubric';
import { runDeterministicChecks, scoreKeywordAlignment, parseQualityGate, sanitizeJobDescription } from '@/lib/cvDeterministicChecks';
import { createRouter } from '@/lib/ai/router';
import { ProviderError } from '@/lib/ai/provider';
import { buildCacheKey, getCachedResult, setCachedResult } from '@/lib/kv-cache';
import { runMergedCall } from '@/lib/ai/merged-call';
import { buildDeterministicFeedback, computeConfidence, buildNeutralLlmResponse } from '@/lib/cvFeedback';
import { recordCheckOutcome, recordLatencyMs, recordPrecheckOutcome } from '@/lib/telemetry';
import { resolvePrecheck, withPrecheck } from '@/lib/precheck/wiring';
import { scoreLocally, type ScoringTier } from '@/lib/localEngine';
import type { PrecheckResult } from '@/lib/precheck/types';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

/** Feature flag — default OFF, switchable via env without redeploy (per CLAUDE.md). */
function precheckEnabled(): boolean {
  return process.env.PRECHECK_ENABLED === 'true';
}

const CvCheckSchema = z.object({
  cvText: z.string().min(50, 'CV text must be at least 50 characters'),
  roleSlug: z.string().min(1, 'Role is required'),
  jobDescription: z.string().optional(),
  /** Default 'paid' preserves the existing Groq path byte-for-byte. */
  tier: z.enum(['free', 'paid']).default('paid'),
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

// ─── CV check ─────────────────────────────────────────────────────────
// Paid path: AiRouter (Groq primary → Gemini fallback). ProviderError{exhausted}
// propagates to the client so the UI can show a graceful retry message.
// Free path: localEngine only — never constructs a router or calls a provider.

/**
 * Testable entry point used by the server function. Exported so the free-tier
 * no-AI guard can call it without going through TanStack Start's RPC wrapper.
 */
export async function runCruiseCvCheck(input: CvCheckInput): Promise<CvCheckOutcome> {
  const startMs = Date.now();
  const parsed = CvCheckSchema.parse(input);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);

  const scoringTier: ScoringTier = parsed.tier ?? 'paid';

  const cleanJd = sanitizeJobDescription(parsed.jobDescription) ?? undefined;

  // Hard gates (surfaced in precheck.hardGateFailures, never subtracted from
  // the headline score):
  //   - Sommelier / Wine Waiter only: missing BOTH WSET and CMS
  //   - Term-bank roles (cabin-steward, youth-staff): experience shortfall
  // STCW / ENG1 / HACCP never gate a role and never move the score.
  const precheck: PrecheckResult | null = resolvePrecheck(parsed.cvText, parsed.roleSlug, precheckEnabled());

  const cacheKey = await buildCacheKey(parsed.cvText, cleanJd, parsed.roleSlug, scoringTier);
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    console.log(`[cv-check] cache hit: ${cacheKey}`);
    return { kind: 'scored', result: withPrecheck(cached, precheck, false) };
  }
  console.log(`[cv-check] cache miss: ${cacheKey}`);

  const signals = runDeterministicChecks(parsed.cvText);

  const qualityFailure = parseQualityGate(parsed.cvText, signals);
  if (qualityFailure) {
    console.log(`[cv-check] quality gate: ${qualityFailure.kind}`);
    recordCheckOutcome(qualityFailure.kind);
    recordLatencyMs(Date.now() - startMs);
    return qualityFailure;
  }

  // Free tier: local engine only. No prompt, no router, no provider.
  if (scoringTier === 'free') {
    const localResult = scoreLocally(
      { cvText: parsed.cvText, roleSlug: parsed.roleSlug, jobDescription: cleanJd },
      { precheckEnabled: precheckEnabled() },
    );
    void setCachedResult(cacheKey, localResult);
    recordCheckOutcome('scored', localResult.overallScore);
    if (localResult.precheck) recordPrecheckOutcome(localResult.precheck.hardGateFailures.length, false);
    recordLatencyMs(Date.now() - startMs);
    return { kind: 'scored', result: localResult };
  }

  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(
    parsed.cvText,
    role.keywords,
    cleanJd,
  );

  const deterministicFeedback = buildDeterministicFeedback(missingKeywords, signals, role.role);

  if (precheck && precheck.hardGateFailures.length > 0) {
    recordPrecheckOutcome(precheck.hardGateFailures.length, true);
    const neutralLlm = buildNeutralLlmResponse(matchRatio, signals, parsed.cvText, parsed.roleSlug);
    const gatedResult: CvScoreResult = {
      ...computeCvScore(neutralLlm, matchedKeywords, missingKeywords, parsed.roleSlug),
      deterministicFeedback,
      confidence: computeConfidence(signals, matchRatio),
    };
    recordCheckOutcome('scored', gatedResult.overallScore);
    recordLatencyMs(Date.now() - startMs);
    console.log(`[cv-check] pre-check hard gate → AI skipped (${precheck.hardGateFailures.length})`);
    return { kind: 'scored', result: withPrecheck(gatedResult, precheck, true) };
  }

  const { system, user } = buildCvCheckPrompt({
    cvText: parsed.cvText,
    role,
    signals,
    matchedKeywords,
    missingKeywords,
    matchRatio,
    jobDescription: cleanJd,
  });

  const router = await createRouter({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    WORKERS_AI_ENABLED: process.env.WORKERS_AI_ENABLED,
  });

  const mergedCallEnabled = process.env.MERGED_CALL === 'true';

  let llmParsed;
  try {
    if (mergedCallEnabled) {
      const merged = await runMergedCall(router, system, user, parsed.cvText);
      llmParsed = merged.analysis;
    } else {
      llmParsed = await router.analyze({ system, user });
    }
  } catch (err) {
    if (err instanceof ProviderError && err.kind === 'exhausted') {
      console.log('[cv-check] exhausted: returning deterministic-only result');
      const neutralLlm = buildNeutralLlmResponse(matchRatio, signals, parsed.cvText, parsed.roleSlug);
      const degradedResult = {
        ...computeCvScore(neutralLlm, matchedKeywords, missingKeywords, parsed.roleSlug),
        deterministicFeedback,
        confidence: computeConfidence(signals, matchRatio, true),
        isDegraded: true,
      };
      recordCheckOutcome('scored', degradedResult.overallScore);
      if (precheck) recordPrecheckOutcome(precheck.hardGateFailures.length, false);
      recordLatencyMs(Date.now() - startMs);
      return { kind: 'scored', result: withPrecheck(degradedResult, precheck, false) };
    }
    throw err;
  }

  const result: CvScoreResult = {
    ...computeCvScore(llmParsed, matchedKeywords, missingKeywords, parsed.roleSlug),
    deterministicFeedback,
    confidence: computeConfidence(signals, matchRatio),
  };

  void setCachedResult(cacheKey, result);

  recordCheckOutcome('scored', result.overallScore);
  if (precheck) recordPrecheckOutcome(precheck.hardGateFailures.length, false);
  recordLatencyMs(Date.now() - startMs);

  return { kind: 'scored', result: withPrecheck(result, precheck, false) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkCruiseCv = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<CvCheckOutcome> => {
  const parsed = CvCheckSchema.parse(ctx.data as CvCheckInput);
  return runCruiseCvCheck(parsed);
});

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
