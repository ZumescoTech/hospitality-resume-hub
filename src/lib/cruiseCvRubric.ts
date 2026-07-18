// cruiseCvRubric.ts
// Defines types, weighted scoring constants, prompt builder, response parser,
// and deterministic score computation for the cruise CV checker.
//
// B-1 rubric alignment: weights now match Packet B §2 exactly.
// Seven dimensions: keywordAlignment 25%, experienceDepth 25%,
// quantifiedAchievements 15%, qualifications 10%, cruiseReadiness 10%,
// atsParseability 10%, summaryQuality 5%.

import type { DeterministicSignals } from './cvDeterministicChecks';

// ─── Scoring version (cache salt + golden-file contract) ─────────────────────
// Bump whenever scoring logic, weights, or the keyword map changes.
// KV cache keys are salted with this value; stale cache entries are ignored.
export const SCORING_VERSION = '1';

// ─── Role types ───────────────────────────────────────────────────────────────

export interface CruiseRole {
  slug: string;
  role: string;
  summary: string;
  experienceRequirements: string[];
  cvExpectations: string[];
  certifications: string[];
  languages: string;
  keywords: string[];
  sourceCount: string | number;
  sourceLinks: string[];
}

export interface CruiseRolesData {
  roles: CruiseRole[];
}

// ─── Score types ──────────────────────────────────────────────────────────────

export interface CvCategoryScore {
  score: number;   // 0–100
  weight: number;  // decimal weight, e.g. 0.25
  feedback: string;
}

export interface CvScoreResult {
  overallScore: number;
  tier: 'Strong' | 'Good' | 'Needs Work' | 'Major Gaps';
  categories: {
    keywordAlignment: CvCategoryScore;        // 25%
    experienceDepth: CvCategoryScore;         // 25%
    quantifiedAchievements: CvCategoryScore;  // 15%
    qualifications: CvCategoryScore;          // 10%
    cruiseReadiness: CvCategoryScore;         // 10%
    atsParseability: CvCategoryScore;         // 10%
    summaryQuality: CvCategoryScore;          //  5%
  };
  topFixes: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

// ─── Weights & labels ─────────────────────────────────────────────────────────

export const CATEGORY_WEIGHTS = {
  keywordAlignment:       0.25,
  experienceDepth:        0.25,
  quantifiedAchievements: 0.15,
  qualifications:         0.10,
  cruiseReadiness:        0.10,
  atsParseability:        0.10,
  summaryQuality:         0.05,
} as const;

export type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  keywordAlignment:       'Keyword Alignment',
  experienceDepth:        'Experience Depth',
  quantifiedAchievements: 'Quantified Achievements',
  qualifications:         'Qualifications',
  cruiseReadiness:        'Cruise Readiness',
  atsParseability:        'ATS Parseability',
  summaryQuality:         'Summary Quality',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

export interface BuildPromptInput {
  cvText: string;
  role: CruiseRole;
  signals: DeterministicSignals;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchRatio: number;
  jobDescription?: string;
}

export function buildCvCheckPrompt({
  cvText,
  role,
  signals,
  matchedKeywords,
  missingKeywords,
  matchRatio,
  jobDescription,
}: BuildPromptInput): { system: string; user: string } {
  const system = `You are an expert cruise ship hotel-department recruiter scoring a CV for the role of "${role.role}".

Score the CV on 7 dimensions. For each, give a score 0–100 and 1–2 sentences of specific, actionable feedback.

For keywordAlignment and atsParseability, base your scores heavily on the pre-computed data provided in the user message — do not re-derive them from scratch.

Respond with ONLY valid JSON, no markdown fences, no other text:
{
  "keywordAlignment": { "score": number, "feedback": "string" },
  "experienceDepth": { "score": number, "feedback": "string" },
  "quantifiedAchievements": { "score": number, "feedback": "string" },
  "qualifications": { "score": number, "feedback": "string" },
  "cruiseReadiness": { "score": number, "feedback": "string" },
  "atsParseability": { "score": number, "feedback": "string" },
  "summaryQuality": { "score": number, "feedback": "string" },
  "topFixes": ["string", "string"]
}

SCORING DIMENSIONS AND WEIGHTS:

keywordAlignment (25%): How well does the CV use the role's required vocabulary? Use the pre-computed keyword match data provided. A high match ratio (>70%) should score 75+; low ratio (<30%) should score below 40.

experienceDepth (25%): Years, seniority, and progression in roles directly relevant to cruise hospitality. Cruise or shipboard experience is the HIGHEST signal in this dimension — a candidate who has worked on a cruise ship scores 15–25 points higher than an equivalent land-only candidate. Score land-only experience honestly: two years at a 5-star land restaurant without any cruise exposure should not exceed 65 on this dimension for a cruise-ship role. No relevant experience at all should score below 20.

quantifiedAchievements (15%): Do bullet points include measurable scale or impact — covers, guests, revenue figures, team size, star rating of venue, percentage growth? Unquantified bullets ("helped with service", "assisted guests") score below 30.

qualifications (10%): Relevant formal qualifications — WSET Level 2 or above, Cape Wine Academy, Court of Master Sommeliers, hospitality management diplomas, food safety certifications. WSET Level 1 or only a matric/school diploma scores below 25.

cruiseReadiness (10%): Cruise-specific compliance documents and signals — C1/D US visa, Seafarer's Medical Certificate (ENG1), Seaman's Discharge Book, STCW Basic Safety Training. These are critical differentiators a generic ATS misses. A candidate listing all four scores 85+. A candidate listing none scores 0–15, even if otherwise qualified. A candidate listing one or two scores proportionally between.

atsParseability (10%): Standard section headings present, contact info findable, no garbled text, consistent date formats, readable layout. Use the pre-computed signals.

summaryQuality (5%): Does the opening summary/profile lead with specialty + years of experience, tailored to the target role? A generic "I am hardworking" statement scores below 20. A targeted sommelier summary with years and key credentials scores 80+.

IMPORTANT CALIBRATION RULE: A CV can be genuinely on-topic and score in the 30–45 range overall — real F&B or waiter experience without wine specialism or cruise exposure deserves this band, not a rejection. Only a CV from a completely different field (e.g. office admin, engineering) belongs below 20. Do not collapse all imperfect hospitality CVs into the 0–20 range.

SYNTHETIC EXAMPLES (calibration only — not real candidates):

Example A — strong sommelier candidate (overall ≈ 87):
Profile: 8 years senior sommelier, WSET Level 3, 2-year Royal Caribbean contract, manages 500-label cellar with £250k annual budget, 25% beverage revenue growth, C1/D visa and ENG1 medical on file.
Scores → keywordAlignment: 90, experienceDepth: 88, quantifiedAchievements: 85, qualifications: 88, cruiseReadiness: 85, atsParseability: 80, summaryQuality: 82
Weighted total: 87

Example B — entry-level waiter, no wine specialism (overall ≈ 35):
Profile: 18 months at a local family restaurant (waiter and kitchen helper), no wine credentials, no cruise or shipboard experience, no seafarer documents, generic "I am hardworking" summary, no quantified achievements.
Scores → keywordAlignment: 38, experienceDepth: 42, quantifiedAchievements: 18, qualifications: 12, cruiseReadiness: 5, atsParseability: 75, summaryQuality: 25
Weighted total: 35

topFixes: exactly 2 strings — the two highest-impact changes this specific candidate should make right now. Be concrete and role-specific. Avoid generic advice like "improve formatting" unless formatting is genuinely the biggest gap.`;

  const user = `ROLE: ${role.role}
ROLE SUMMARY: ${role.summary}
EXPERIENCE REQUIREMENTS: ${role.experienceRequirements.slice(0, 5).join('; ')}
RELEVANT CERTIFICATIONS FOR THIS ROLE: ${role.certifications.join('; ')}

--- PRE-COMPUTED KEYWORD DATA (use this for keywordAlignment score) ---
Match ratio: ${Math.round(matchRatio * 100)}% (${matchedKeywords.length} of ${matchedKeywords.length + missingKeywords.length} role keywords found)
Matched: ${matchedKeywords.slice(0, 15).join(', ') || 'none'}
Missing: ${missingKeywords.slice(0, 12).join(', ') || 'none'}

--- PRE-COMPUTED ATS SIGNALS (use this for atsParseability score) ---
Section headings found: ${signals.headingsFound.length > 0 ? signals.headingsFound.join(', ') : 'none detected'}
Contact info in body: ${signals.hasContactInfo ? 'yes' : 'no'}
Summary/profile section: ${signals.hasSummarySection ? 'present' : 'absent'}
Word count: ${signals.wordCount}
Lines with quantified metrics: ${signals.quantifiedBulletCount}
Suspect garbled/merged text: ${signals.suspectGarbledText ? 'YES — may affect ATS parsing' : 'no'}

--- CV TEXT ---
"""
${cvText.slice(0, 6000)}
"""

${jobDescription?.trim() ? `--- SPECIFIC JOB DESCRIPTION (use to inform keywordAlignment context) ---
"""
${jobDescription.trim().slice(0, 1500)}
"""

` : ''}Score this CV now.`;

  return { system, user };
}

// ─── Response parser ──────────────────────────────────────────────────────────

type RawCategory = { score: number; feedback: string };
export type RawLlmResponse = Record<CategoryKey, RawCategory> & { topFixes: string[] };

/** Thrown when the LLM response cannot be parsed into a valid score object. */
export class ScoreParseError extends Error {
  constructor(message: string, public readonly rawResponse: string) {
    super(`ScoreParseError: ${message}`);
    this.name = 'ScoreParseError';
  }
}

export function parseCvCheckResponse(raw: string): RawLlmResponse {
  // 1. Strip markdown fences
  let cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();

  // 2. Extract the first JSON object even if surrounded by prose
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new ScoreParseError('No JSON object found in model response', raw);
  }
  cleaned = jsonMatch[0];

  // 3. Parse — throw ScoreParseError (not a generic SyntaxError) on failure
  let parsed: RawLlmResponse;
  try {
    parsed = JSON.parse(cleaned) as RawLlmResponse;
  } catch (err) {
    throw new ScoreParseError(
      `JSON.parse failed: ${err instanceof Error ? err.message : String(err)}`,
      raw,
    );
  }

  // 4. Validate all required categories have numeric scores
  const required: CategoryKey[] = [
    'keywordAlignment',
    'experienceDepth',
    'quantifiedAchievements',
    'qualifications',
    'cruiseReadiness',
    'atsParseability',
    'summaryQuality',
  ];

  for (const key of required) {
    if (typeof parsed[key]?.score !== 'number') {
      throw new ScoreParseError(
        `Missing or non-numeric score for category "${key}"`,
        raw,
      );
    }
  }

  if (!Array.isArray(parsed.topFixes)) parsed.topFixes = [];

  return parsed;
}

// ─── Score computation (fully deterministic, no LLM) ─────────────────────────

/** Exported so tests can assert score↔tier consistency directly. */
export function toTierFromScore(score: number): CvScoreResult['tier'] {
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Major Gaps';
}

export function computeCvScore(
  parsed: RawLlmResponse,
  matchedKeywords: string[],
  missingKeywords: string[],
): CvScoreResult {
  const keys = Object.keys(CATEGORY_WEIGHTS) as CategoryKey[];

  let overallScore = 0;
  for (const key of keys) {
    overallScore += (parsed[key]?.score ?? 50) * CATEGORY_WEIGHTS[key];
  }
  overallScore = Math.round(overallScore);

  const categories = {} as CvScoreResult['categories'];
  for (const key of keys) {
    categories[key] = {
      score: Math.min(100, Math.max(0, Math.round(parsed[key]?.score ?? 50))),
      weight: CATEGORY_WEIGHTS[key],
      feedback: parsed[key]?.feedback ?? '',
    };
  }

  return {
    overallScore,
    tier: toTierFromScore(overallScore),
    categories,
    topFixes: parsed.topFixes.slice(0, 2),
    matchedKeywords,
    missingKeywords,
  };
}
