import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
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
import {
  advanceJourneyStage,
  buildLeadNotifyEmail,
  buildLeadRow,
  journeyTimestampColumn,
  type JourneyStage,
} from '@/lib/leads';
import type { PrecheckResult } from '@/lib/precheck/types';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

function precheckEnabled(): boolean {
  return process.env.PRECHECK_ENABLED === 'true';
}

function roleLabelFor(slug: string): string {
  return rolesData.roles.find((r) => r.slug === slug)?.role ?? slug;
}

function getLeadDb() {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function postJson(url: string, body: unknown): Promise<boolean> {
  const payload = JSON.stringify(body);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': String(new TextEncoder().encode(payload).length),
    },
    body: payload,
  });
  return res.ok;
}

async function notifyLeadCaptured(row: ReturnType<typeof buildLeadRow>, leadId: string): Promise<boolean> {
  const email = buildLeadNotifyEmail(row, leadId);
  const webhookUrl = process.env.LEAD_NOTIFY_WEBHOOK_URL || process.env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL;
  let notified = false;
  if (webhookUrl) {
    try {
      notified = await postJson(webhookUrl, {
        ...row,
        lead_id: leadId,
        event: 'lead_captured',
        subject: email.subject,
        text: email.text,
        created_at: new Date().toISOString(),
      });
    } catch {
      notified = false;
    }
  }
  const resendKey = process.env.RESEND_API_KEY;
  const to = process.env.LEAD_NOTIFY_EMAIL;
  if (resendKey && to) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.LEAD_NOTIFY_FROM || 'GetHired Leads <alerts@gethired.local>',
          to: [to],
          subject: email.subject,
          text: email.text,
        }),
      });
      if (res.ok) notified = true;
    } catch {
      /* notification is best-effort */
    }
  }
  return notified;
}

const CvCheckSchema = z.object({
  cvText: z.string().min(50, 'CV text must be at least 50 characters'),
  roleSlug: z.string().min(1, 'Role is required'),
  jobDescription: z.string().optional(),
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
  full_name: z.string().optional(),
  email_from_cv: z.string().optional(),
});

const TrackJourneySchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(['captured', 'builder_opened', 'cv_edited', 'exported']),
  fullName: z.string().optional(),
});

export type CvCheckInput = z.infer<typeof CvCheckSchema>;
export type SaveLeadInput = z.infer<typeof SaveLeadSchema>;
export type TrackJourneyInput = z.infer<typeof TrackJourneySchema>;

export function buildLeadWebhookPayload(parsed: SaveLeadInput): {
  whatsapp_number: string;
  country_code: string;
  role: string;
  role_slug: string;
  score: number;
  tier: string;
  top_fixes: string;
  opted_in: boolean;
  created_at: string;
  full_name: string;
} {
  return {
    whatsapp_number: parsed.whatsapp_number,
    country_code: parsed.country_code,
    role: roleLabelFor(parsed.roleSlug),
    role_slug: parsed.roleSlug,
    score: parsed.overallScore,
    tier: parsed.tier,
    top_fixes: parsed.topFixes.join(' | '),
    opted_in: parsed.opted_in,
    created_at: new Date().toISOString(),
    full_name: parsed.full_name?.trim() || '',
  };
}

export function publicCruiseCvCheckData(input: {
  cvText: string;
  roleSlug: string;
  jobDescription?: string;
}): CvCheckInput {
  const jd = input.jobDescription?.trim();
  return {
    cvText: input.cvText,
    roleSlug: input.roleSlug,
    jobDescription: jd ? jd : undefined,
    tier: 'free',
  };
}

export async function persistCvLead(parsed: SaveLeadInput): Promise<{
  ok: boolean;
  leadId?: string;
  waMeUrl?: string;
}> {
  if (!parsed.opted_in) return { ok: false };
  const row = buildLeadRow({
    ...parsed,
    roleLabel: roleLabelFor(parsed.roleSlug),
  });
  const db = getLeadDb();
  let leadId: string | undefined;
  if (db) {
    const { data: existing } = await db
      .from('gethired_leads')
      .select('id, journey_stage, full_name')
      .eq('phone', row.phone)
      .maybeSingle();
    if (existing?.id) {
      const nextStage = advanceJourneyStage(existing.journey_stage as JourneyStage, 'captured');
      const { error } = await db
        .from('gethired_leads')
        .update({
          ...row,
          full_name: row.full_name || existing.full_name,
          journey_stage: nextStage,
        })
        .eq('id', existing.id);
      if (!error) leadId = existing.id;
    } else {
      const { data: inserted, error } = await db
        .from('gethired_leads')
        .insert(row)
        .select('id')
        .single();
      if (!error) leadId = inserted?.id;
    }
    if (leadId) {
      await db.from('gethired_lead_events').insert({
        lead_id: leadId,
        event: 'captured',
        payload: { role_slug: row.role_slug, score: row.score, consent: row.consent },
      });
    }
  }
  if (leadId) {
    const notified = await notifyLeadCaptured(row, leadId);
    if (notified && db) {
      await db.from('gethired_leads').update({ email_notified_at: new Date().toISOString() }).eq('id', leadId);
    }
  } else {
    const webhookUrl = process.env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL || process.env.LEAD_NOTIFY_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await postJson(webhookUrl, buildLeadWebhookPayload(parsed));
      } catch {
        /* best-effort fallback */
      }
    }
  }
  return { ok: true, leadId, waMeUrl: row.wa_me_url };
}

export async function persistLeadJourney(input: TrackJourneyInput): Promise<{ ok: boolean }> {
  const db = getLeadDb();
  if (!db) return { ok: true };
  const { data: existing } = await db
    .from('gethired_leads')
    .select('id, journey_stage, full_name')
    .eq('id', input.leadId)
    .maybeSingle();
  if (!existing?.id) return { ok: false };
  const nextStage = advanceJourneyStage(existing.journey_stage as JourneyStage, input.stage);
  const now = new Date().toISOString();
  const stampCol = journeyTimestampColumn(input.stage);
  const patch: Record<string, unknown> = {
    journey_stage: nextStage,
    last_seen_at: now,
    updated_at: now,
  };
  if (input.fullName?.trim()) patch.full_name = input.fullName.trim();
  if (stampCol) patch[stampCol] = now;
  await db.from('gethired_leads').update(patch).eq('id', existing.id);
  await db.from('gethired_lead_events').insert({
    lead_id: existing.id,
    event: input.stage,
    payload: input.fullName?.trim() ? { full_name: input.fullName.trim() } : null,
  });
  return { ok: true };
}

export async function runCruiseCvCheck(input: CvCheckInput): Promise<CvCheckOutcome> {
  const startMs = Date.now();
  const parsed = CvCheckSchema.parse(input);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);
  const scoringTier: ScoringTier = parsed.tier ?? 'paid';
  const cleanJd = sanitizeJobDescription(parsed.jobDescription) ?? undefined;
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
  return persistCvLead(parsed);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const trackLeadJourney = createServerFn({ method: 'POST' }).handler(async (ctx: any) => {
  const parsed = TrackJourneySchema.parse(ctx.data as TrackJourneyInput);
  return persistLeadJourney(parsed);
});

export function getRoleOptions() {
  return rolesData.roles.map((r) => ({ slug: r.slug, label: r.role }));
}
