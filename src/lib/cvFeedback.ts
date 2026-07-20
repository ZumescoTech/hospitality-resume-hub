// cvFeedback.ts
// Zero-token deterministic feedback and confidence engine.
// Runs on the server BEFORE the LLM call (or instead of it on exhausted path).
// All output is based on deterministic signals — no LLM required.

import type { DeterministicSignals } from './cvDeterministicChecks';
import type { RawLlmResponse, CategoryKey } from './cruiseCvRubric';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConfidenceResult {
  level: 'High' | 'Medium' | 'Low';
  reasons: string[];
}

// ─── Keyword → specific suggestion map ────────────────────────────────────────
// Keys are lowercase keywords matching the role keyword list.
// Values are concrete, role-specific suggestions (not generic advice).

const KEYWORD_SUGGESTIONS: Record<string, string> = {
  'stcw':               'Add your STCW Basic Safety Training certificate with its validity date — this is a mandatory compliance requirement for cruise roles',
  'haccp':              'List your HACCP certification level (e.g. Level 2 Food Hygiene) — cruise ship kitchens require documented food safety compliance',
  'wset':               'Mention your WSET qualification level (Level 1–4) — even WSET Level 1 strengthens any beverage role application on a cruise ship',
  'opera pms':          'Add Opera PMS to your systems/skills section — it is the standard property management system on most major cruise lines',
  'micros':             'List Micros POS (or Micros Simphony) in your technical skills — nearly all cruise F&B and bar outlets use it',
  'cape wine academy':  'Mention your Cape Wine Academy certification if you hold it — it is recognised across luxury cruise lines alongside WSET',
  'cruise ship':        'If you have any shipboard or cruise contract experience, make it the first item in your work history — it is the single strongest signal for cruise recruiters',
  'cruise contract':    'Describe your cruise contract(s) explicitly — include the ship name, cruise line, contract length, and vessel capacity',
  'seafarer':           'Add your Seafarer\'s Medical Certificate (ENG1) and Seaman\'s Discharge Book if you hold them',
  'upselling':          'Quantify your upselling results — e.g. "generated €3,200 in retail sales over a 9-month contract" or "achieved top-3 upsell ranking in a team of 8"',
  'guest satisfaction': 'Include your guest satisfaction score or rebooking rate — e.g. "94% rebooking rate", "NPS score 4.9/5.0", or "ranked #1 in ship-wide guest survey"',
  'wine service':       'Describe your wine service experience specifically — wine list size, pairing advice given, cellar management responsibilities',
  'silver service':     'Mention Silver Service or plated fine-dining service experience — it is a differentiator for premium cruise dining roles',
  'fine dining':        'Specify the tier of restaurants you have worked in — Michelin-starred, 5-star hotel, luxury cruise = strongest signal; name the venue',
  'sommelier':          'Use the title "Sommelier" or "Wine Steward" in your job titles if applicable, not just in the skills section',
  'pos':                'Name the specific POS systems you have used (Micros, Simphony, Lightspeed) rather than just writing "POS experience"',
  'lightspeed':         'Add Lightspeed POS to your technical skills if you have used it',
  'eazywine':           'Mention Eazywine in your systems section — it is used aboard several premium cruise lines',
};

// Fallback for keywords with no specific entry
function genericSuggestion(kw: string): string {
  return `Add "${kw}" to your CV — it is listed as a key requirement for this role`;
}

// ─── Feedback builder ─────────────────────────────────────────────────────────

/**
 * Returns up to 5 specific, actionable improvement suggestions derived
 * entirely from deterministic signals and the missing keyword list.
 * No LLM call required.
 */
export function buildDeterministicFeedback(
  missingKeywords: string[],
  signals: DeterministicSignals,
  roleName: string,
): string[] {
  const suggestions: string[] = [];

  // 1. Signal-based checks first (highest priority / most impactful)
  if (!signals.hasContactInfo) {
    suggestions.push('Add your email address and phone number clearly at the top of your CV');
  }
  if (!signals.hasSummarySection) {
    suggestions.push(`Add a professional summary at the top tailored to the ${roleName} position — lead with your speciality and years of experience`);
  }
  if (signals.suspectGarbledText) {
    suggestions.push('Your CV file may contain garbled text from PDF conversion — try re-uploading as a Word (.docx) file for cleaner text extraction');
  }
  if (signals.wordCount < 200) {
    suggestions.push('Your CV appears very short — add more detail about your day-to-day responsibilities, the scale of operations, and specific achievements in each role');
  }
  if (signals.quantifiedBulletCount === 0 && signals.wordCount > 150) {
    suggestions.push('Add numbers to your bullet points — guests served per shift, team size, revenue figures, or satisfaction scores make your achievements concrete');
  }

  // 2. Missing keyword suggestions (up to fill the rest of a 5-item list)
  const remainingSlots = 5 - suggestions.length;
  for (const kw of missingKeywords.slice(0, remainingSlots)) {
    const kwLower = kw.toLowerCase();
    const tip = KEYWORD_SUGGESTIONS[kwLower] ?? genericSuggestion(kw);
    suggestions.push(tip);
  }

  return suggestions.slice(0, 5);
}

// ─── Confidence engine ────────────────────────────────────────────────────────

/**
 * Computes a confidence level for the analysis result.
 * High = clean text, all ATS signals present, reasonable keyword coverage.
 * Medium = one or two minor issues.
 * Low = garbled text, very short CV, or extremely low keyword match.
 */
export function computeConfidence(
  signals: DeterministicSignals,
  matchRatio: number,
  isDegraded?: boolean,
): ConfidenceResult {
  const reasons: string[] = [];

  if (isDegraded) {
    reasons.push('AI scoring temporarily unavailable — analysis is based on keyword matching and CV structure only');
    return { level: 'Low', reasons };
  }

  if (signals.suspectGarbledText) {
    reasons.push('Text quality issues detected — your CV may not have extracted cleanly from the file');
  }
  if (signals.wordCount < 150) {
    reasons.push('Very short CV — key details may be missing or not extracted');
  }
  if (!signals.hasContactInfo) {
    reasons.push('No contact information found in the CV text');
  }
  if (!signals.hasSummarySection) {
    reasons.push('No summary or profile section detected');
  }
  if (matchRatio < 0.15) {
    reasons.push('Very low keyword match — the CV may not be relevant to this specific role');
  }

  const issueCount = reasons.length;

  if (issueCount === 0) {
    return { level: 'High', reasons: ['Clean text, all standard sections present, good keyword coverage'] };
  }
  if (signals.suspectGarbledText || signals.wordCount < 150) {
    return { level: 'Low', reasons };
  }
  return { level: 'Medium', reasons };
}

// ─── Neutral LLM response for degraded mode ───────────────────────────────────

/**
 * When both AI providers are exhausted, construct a neutral RawLlmResponse
 * using deterministic proxies so the scoring engine can still produce a
 * partial result rather than a blank page.
 *
 * Scores derived here are clearly approximate (not LLM-calibrated).
 */
export function buildNeutralLlmResponse(
  matchRatio: number,
  signals: DeterministicSignals,
): RawLlmResponse {
  const degradedNote = 'AI unavailable — approximate score based on CV structure';

  // keywordAlignment: directly from match ratio
  const kwScore = Math.round(Math.min(95, matchRatio * 130)); // scale 0-1 → 0-100+, cap at 95

  // atsParseability: from structural signals
  let atsScore = 50;
  if (signals.hasContactInfo) atsScore += 15;
  if (signals.hasSummarySection) atsScore += 10;
  if (signals.headingsFound.length >= 3) atsScore += 10;
  if (!signals.suspectGarbledText) atsScore += 10;
  if (signals.wordCount > 300) atsScore += 5;
  atsScore = Math.min(100, atsScore);

  // quantifiedAchievements: from quantified bullet count
  const qaScore = Math.min(80, 20 + signals.quantifiedBulletCount * 8);

  const neutral = (key: string): { score: number; feedback: string } => ({
    score: 50,
    feedback: degradedNote,
  });

  return {
    keywordAlignment:       { score: kwScore,  feedback: degradedNote },
    experienceDepth:        { score: 50,        feedback: degradedNote },
    quantifiedAchievements: { score: qaScore,   feedback: degradedNote },
    qualifications:         { score: 50,        feedback: degradedNote },
    cruiseReadiness:        { score: 50,        feedback: degradedNote },
    atsParseability:        { score: atsScore,  feedback: degradedNote },
    summaryQuality:         { score: 50,        feedback: degradedNote },
    topFixes: [],
  } as RawLlmResponse;
}
