// localEngine.ts
// Free-tier local ATS scorer. Orchestrates existing pure functions — it does
// not reimplement scoring math. Zero AI / network.
//
// Emits the same CvScoreResult shape the paid path produces so the UI and a
// later bounded-adjustment step can reuse it without a contract change.

import {
  computeCvScore,
  type CruiseRolesData,
  type CvScoreResult,
} from '@/lib/cruiseCvRubric';
import {
  runDeterministicChecks,
  scoreKeywordAlignment,
  sanitizeJobDescription,
} from '@/lib/cvDeterministicChecks';
import {
  buildDeterministicFeedback,
  computeConfidence,
  buildNeutralLlmResponse,
} from '@/lib/cvFeedback';
import { resolvePrecheck, withPrecheck } from '@/lib/precheck/wiring';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

const LOCAL_FEEDBACK =
  'Scored from CV structure and role keywords (local ATS engine).';

export type ScoringTier = 'free' | 'paid';

export interface LocalEngineInput {
  cvText: string;
  roleSlug: string;
  jobDescription?: string;
}

export interface LocalEngineOptions {
  /** When omitted, precheck is not attached (tests can opt in). */
  precheckEnabled?: boolean;
}

/**
 * Produce a complete CvScoreResult from local signals only.
 * Throws if `roleSlug` is not in cruise-roles.json (same contract as the
 * paid checker).
 */
export function scoreLocally(
  input: LocalEngineInput,
  options: LocalEngineOptions = {},
): CvScoreResult {
  const role = rolesData.roles.find((r) => r.slug === input.roleSlug);
  if (!role) throw new Error(`Unknown role: ${input.roleSlug}`);

  const cleanJd = sanitizeJobDescription(input.jobDescription) ?? undefined;
  const signals = runDeterministicChecks(input.cvText);
  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(
    input.cvText,
    role.keywords,
    cleanJd,
  );

  const neutral = buildNeutralLlmResponse(
    matchRatio,
    signals,
    input.cvText,
    input.roleSlug,
  );

  // Replace the degraded-path "AI unavailable" copy — this is a first-class
  // local score, not a fallback.
  for (const key of Object.keys(neutral) as Array<keyof typeof neutral>) {
    if (key === 'topFixes') continue;
    const cat = neutral[key];
    if (cat && typeof cat === 'object' && 'feedback' in cat) {
      cat.feedback = LOCAL_FEEDBACK;
    }
  }

  const deterministicFeedback = buildDeterministicFeedback(
    missingKeywords,
    signals,
    role.role,
  );

  const scored: CvScoreResult = {
    ...computeCvScore(neutral, matchedKeywords, missingKeywords, input.roleSlug),
    topFixes: deterministicFeedback.slice(0, 2),
    deterministicFeedback,
    confidence: computeConfidence(signals, matchRatio, false),
  };

  if (!options.precheckEnabled) return scored;

  const precheck = resolvePrecheck(input.cvText, input.roleSlug, true);
  // Free tier always runs locally — never skip the score because of a gate.
  return withPrecheck(scored, precheck, false);
}
