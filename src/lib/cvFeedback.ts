// cvFeedback.ts
// Zero-token deterministic feedback and confidence engine.
// Runs on the server BEFORE the LLM call (or instead of it on exhausted path).
// All output is based on deterministic signals — no LLM required.

import type { DeterministicSignals } from './cvDeterministicChecks';
import type { RawLlmResponse, CategoryKey } from './cruiseCvRubric';
import { estimateCvExperienceYears } from './precheck/prechecker';
import { SOMMELIER_SLUG } from './precheck/certGate';

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

const clamp = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/** Words that signal a generic, un-tailored summary when no specificity is present. */
const GENERIC_SUMMARY_RE =
  /\b(hard[\s-]?working|team\s*player|passionate|motivated|responsible|dedicated|reliable|fast\s*learner|people\s*person|go[\s-]?getter)\b/i;

/** Specialty / role terms that mark a summary (or CV) as on-topic for hospitality. */
const SPECIALTY_RE =
  /\b(sommelier|wine|waiter|waitress|bartender|barista|chef|cook|galley|housekeep\w*|cabin|stateroom|steward\w*|butler|concierge|reception\w*|front\s*desk|f&b|food\s*and\s*beverage|hospitality|guest\s*service|fine\s*dining|silver\s*service|spa|therapist)\b/i;

/** Genuine cruise/shipboard EXPERIENCE markers — deliberately excludes certs/docs. */
const CRUISE_EXPERIENCE_RE =
  /\b(cruise|cruise\s*line|cruise\s*ship|ship\s*board|shipboard|on[\s-]?board|onboard|vessel|at\s*sea|sea\s*going|seagoing|liner|cunard|msc|royal\s*caribbean|norwegian|celebrity|carnival|princess\s*cruises?|holland\s*america|disney\s*cruise|oceania|silversea|seabourn|viking)\b/gi;

/** Non-cert academic / role qualifications (degrees, diplomas). */
const ACADEMIC_QUAL_RE =
  /\b(diploma|degree|bachelor|b\.?sc|b\.?a\b|masters?\s+degree|hospitality\s*management|culinary\s*(school|arts|diploma)|hotel\s*school)\b/i;

/** Wine credentials that DO count for the sommelier role (role-conditional). */
const WINE_CERT_RE = /\bwset\b|court\s+of\s+master\s+sommeliers?|\bcms\b|cape\s+wine\s+academy/i;

/** Pull the summary/profile block: lines after a Summary heading, else the top lines. */
function extractSummaryBlock(cvText: string): string {
  const lines = cvText.split(/\r?\n/).map((l) => l.trim());
  const idx = lines.findIndex((l) => /^(summary|profile|objective|about\s+me)\b/i.test(l));
  if (idx >= 0) return lines.slice(idx + 1, idx + 4).join(' ');
  return lines.filter(Boolean).slice(1, 4).join(' '); // skip name line, take next few
}

/** Count distinct (case-insensitive) matches of a global regex in text. */
function countDistinct(text: string, re: RegExp): number {
  const found = new Set<string>();
  for (const m of text.matchAll(re)) found.add(m[0].toLowerCase());
  return found.size;
}

/**
 * When both AI providers are exhausted (or a hard gate skips the AI call),
 * construct a neutral RawLlmResponse from DETERMINISTIC signals so the scoring
 * engine still produces a real, content-driven partial result — never a blank
 * page and never a flat 50-per-category placeholder.
 *
 * Every one of the seven dimensions is derived from the CV; none is hardcoded:
 *   - keywordAlignment       ← role keyword match ratio
 *   - experienceDepth        ← years of experience parsed from the CV, nudged by relevance
 *   - quantifiedAchievements ← count of quantified bullet lines
 *   - qualifications         ← role-relevant credentials only (role-conditional cert rule)
 *   - cruiseReadiness        ← genuine cruise/shipboard EXPERIENCE, not certificate presence
 *   - atsParseability        ← structural signals
 *   - summaryQuality         ← targeted vs. generic summary
 *
 * Scores are approximate (not LLM-calibrated) but reflect the actual CV.
 */
export function buildNeutralLlmResponse(
  matchRatio: number,
  signals: DeterministicSignals,
  cvText = '',
  roleSlug?: string,
): RawLlmResponse {
  const note = 'AI unavailable — approximate score derived from CV content';

  // keywordAlignment: directly from match ratio (0-1 → 0-100+, capped)
  const kwScore = clamp(Math.min(95, matchRatio * 130));

  // atsParseability: structural signals
  let atsScore = 50;
  if (signals.hasContactInfo) atsScore += 15;
  if (signals.hasSummarySection) atsScore += 10;
  if (signals.headingsFound.length >= 3) atsScore += 10;
  if (!signals.suspectGarbledText) atsScore += 10;
  if (signals.wordCount > 300) atsScore += 5;
  atsScore = clamp(atsScore);

  // quantifiedAchievements: from quantified bullet count (0 bullets → very low)
  const qaScore = clamp(Math.min(85, 8 + signals.quantifiedBulletCount * 13));

  // experienceDepth: years parsed from the CV, then nudged by keyword relevance
  // so raw tenure in an unrelated field doesn't score as relevant experience.
  const years = estimateCvExperienceYears(cvText);
  const tenureScore = years == null
    ? (signals.wordCount < 150 ? 20 : 35) // no parseable timeline → low/mid proxy
    : Math.min(85, 15 + years * 12);
  const relevanceFactor = 0.6 + 0.4 * Math.min(1, matchRatio * 2); // 0.6 … 1.0
  const expScore = clamp(tenureScore * relevanceFactor);

  // summaryQuality: targeted (years + specialty) beats generic filler.
  const summary = extractSummaryBlock(cvText);
  let sqScore: number;
  if (!signals.hasSummarySection || summary.length === 0) {
    sqScore = 15;
  } else {
    const mentionsYears = /\d+\s*\+?\s*years?/i.test(summary);
    const mentionsSpecialty = SPECIALTY_RE.test(summary);
    const isGeneric = GENERIC_SUMMARY_RE.test(summary);
    if (mentionsYears && mentionsSpecialty) sqScore = 78;
    else if (mentionsSpecialty || mentionsYears) sqScore = 55;
    else if (isGeneric) sqScore = 22;
    else sqScore = 40;
  }
  sqScore = clamp(sqScore);

  // cruiseReadiness: genuine cruise/shipboard EXPERIENCE only (never certs).
  const cruiseHits = countDistinct(cvText, CRUISE_EXPERIENCE_RE);
  const crScore = clamp(cruiseHits === 0 ? 10 : Math.min(85, cruiseHits * 22));

  // qualifications: role-relevant credentials only, respecting the role-conditional
  // cert rule. For non-sommelier roles the compliance certs (STCW/ENG1/HACCP/WSET)
  // are NOT credited here; only academic/role qualifications count. Sommelier
  // additionally credits WSET / CMS.
  const isSommelier = roleSlug === SOMMELIER_SLUG;
  let qualScore = ACADEMIC_QUAL_RE.test(cvText) ? 55 : 25;
  if (isSommelier && WINE_CERT_RE.test(cvText)) qualScore = Math.max(qualScore, 80);
  qualScore = clamp(qualScore);

  return {
    keywordAlignment:       { score: kwScore,   feedback: note },
    experienceDepth:        { score: expScore,  feedback: note },
    quantifiedAchievements: { score: qaScore,   feedback: note },
    qualifications:         { score: qualScore, feedback: note },
    cruiseReadiness:        { score: crScore,   feedback: note },
    atsParseability:        { score: atsScore,  feedback: note },
    summaryQuality:         { score: sqScore,   feedback: note },
    topFixes: [],
  } as RawLlmResponse;
}
