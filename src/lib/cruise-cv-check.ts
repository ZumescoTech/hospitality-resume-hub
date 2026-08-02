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
export const checkCruiseCv = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<CvCheckOutcome> => {
  const startMs = Date.now();
  const parsed = CvCheckSchema.parse(ctx.data as CvCheckInput);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);

  // 0. Sanitize optional job description (strip HTML, reject garbage, cap length)
  const cleanJd = sanitizeJobDescription(parsed.jobDescription) ?? undefined;

  // 0b. Local deterministic pre-check (pure, ~µs). Computed fresh per request and
  //     attached below — never read from or written to the KV cache, so a
  //     term-bank update takes effect immediately with no SCORING_VERSION bump.
  const precheck: PrecheckResult | null = resolvePrecheck(parsed.cvText, parsed.roleSlug, precheckEnabled());

  // 1. KV cache check (before any AI work). The key is salted with the role slug
  //    because scoring is now role-conditional (cert-driven dimensions are
  //    zero-weighted for every role except sommelier). The pre-check is still
  //    attached fresh on every read and never cached.
  const cacheKey = await buildCacheKey(parsed.cvText, cleanJd, parsed.roleSlug);
  const cached = await getCachedResult(cacheKey);
  if (cached) {
    console.log(`[cv-check] cache hit: ${cacheKey}`);
    return { kind: 'scored', result: withPrecheck(cached, precheck, false) };
  }
  console.log(`[cv-check] cache miss: ${cacheKey}`);

  // 2. Deterministic signals
  const signals = runDeterministicChecks(parsed.cvText);

  // 2b. Parse quality gate — reject garbled/insufficient text BEFORE scoring
  const qualityFailure = parseQualityGate(parsed.cvText, signals);
  if (qualityFailure) {
    console.log(`[cv-check] quality gate: ${qualityFailure.kind}`);
    recordCheckOutcome(qualityFailure.kind);
    recordLatencyMs(Date.now() - startMs);
    return qualityFailure;
  }

  // 3. Keyword alignment
  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(
    parsed.cvText,
    role.keywords,
    cleanJd,
  );

  // 3b. Deterministic feedback + confidence (always computed, zero tokens)
  const deterministicFeedback = buildDeterministicFeedback(missingKeywords, signals, role.role);

  // 3c. Hard-gate short-circuit: if the pre-check found missing hard requirements
  //     (e.g. STCW/ENG1), skip the paid AI call and return a deterministic result
  //     that leads with "fix these blockers first". Not cached (role-agnostic key).
  if (precheck && precheck.hardGateFailures.length > 0) {
    recordPrecheckOutcome(precheck.hardGateFailures.length, true);
    const neutralLlm = buildNeutralLlmResponse(matchRatio, signals);
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

  // 4. Build prompt
  const { system, user } = buildCvCheckPrompt({
    cvText: parsed.cvText,
    role,
    signals,
    matchedKeywords,
    missingKeywords,
    matchRatio,
    jobDescription: cleanJd,
  });

  // 5. Call via router (Groq → Gemini → Workers AI when WORKERS_AI_ENABLED=true)
  const router = await createRouter({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    WORKERS_AI_ENABLED: process.env.WORKERS_AI_ENABLED,
  });

  const mergedCallEnabled = process.env.MERGED_CALL === 'true';

  let llmParsed;
  try {
    if (mergedCallEnabled) {
      // Single-prompt mode: analysis + CV extraction in one LLM call (gated)
      const merged = await runMergedCall(router, system, user, parsed.cvText);
      llmParsed = merged.analysis;
      // merged.resumeData is available for the builder; currently unused in the check path
    } else {
      llmParsed = await router.analyze({ system, user });
    }
  } catch (err) {
    if (err instanceof ProviderError && err.kind === 'exhausted') {
      // Both providers unavailable — return a degraded but useful result
      console.log('[cv-check] exhausted: returning deterministic-only result');
      const neutralLlm = buildNeutralLlmResponse(matchRatio, signals);
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

  // 6. Compute final score deterministically — LLM output never changes the score directly
  const result: CvScoreResult = {
    ...computeCvScore(llmParsed, matchedKeywords, missingKeywords, parsed.roleSlug),
    deterministicFeedback,
    confidence: computeConfidence(signals, matchRatio),
  };

  // 7. Store in KV cache WITHOUT the pre-check (the key is role-salted, but the
  //    pre-check is re-attached fresh on every read). Fire-and-forget.
  void setCachedResult(cacheKey, result);

  // 8. Telemetry (fire-and-forget)
  recordCheckOutcome('scored', result.overallScore);
  if (precheck) recordPrecheckOutcome(precheck.hardGateFailures.length, false);
  recordLatencyMs(Date.now() - startMs);

  return { kind: 'scored', result: withPrecheck(result, precheck, false) };
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
