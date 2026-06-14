// cruiseCvRubric.ts
// Defines types, weighted scoring constants, prompt builder, response parser,
// and deterministic score computation for the cruise CV checker.

import type { DeterministicSignals } from './cvDeterministicChecks';

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
    atsParseability: CvCategoryScore;         // 15%
    quantifiedAchievements: CvCategoryScore;  // 15%
    experienceDepth: CvCategoryScore;         // 15%
    jobTitleAlignment: CvCategoryScore;       // 10%
    qualifications: CvCategoryScore;          // 10%
    readabilityAndSummary: CvCategoryScore;   // 10%
  };
  topFixes: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

// ─── Weights & labels ─────────────────────────────────────────────────────────

export const CATEGORY_WEIGHTS = {
  keywordAlignment: 0.25,
  atsParseability: 0.15,
  quantifiedAchievements: 0.15,
  experienceDepth: 0.15,
  jobTitleAlignment: 0.10,
  qualifications: 0.10,
  readabilityAndSummary: 0.10,
} as const;

export type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  keywordAlignment: 'Keyword Alignment',
  atsParseability: 'ATS Parseability',
  quantifiedAchievements: 'Quantified Achievements',
  experienceDepth: 'Experience Depth',
  jobTitleAlignment: 'Job Title Alignment',
  qualifications: 'Qualifications',
  readabilityAndSummary: 'Readability & Summary',
};

// ─── Prompt builder ───────────────────────────────────────────────────────────

export interface BuildPromptInput {
  cvText: string;
  role: CruiseRole;
  signals: DeterministicSignals;
  matchedKeywords: string[];
  missingKeywords: string[];
  matchRatio: number;
}

export function buildCvCheckPrompt({
  cvText,
  role,
  signals,
  matchedKeywords,
  missingKeywords,
  matchRatio,
}: BuildPromptInput): { system: string; user: string } {
  const system = `You are an expert cruise ship hotel-department recruiter scoring a CV for the role of "${role.role}".

Score the CV on 7 categories. For each, give a score 0-100 and 1-2 sentences of specific, actionable feedback.

IMPORTANT — do NOT mention or evaluate: seafarer certifications, language proficiency, cover letters, or contract availability. These are out of scope.

For keywordAlignment and atsParseability, base your scores heavily on the pre-computed data provided in the user message — do not re-derive them from scratch.

Respond with ONLY valid JSON, no markdown fences, no other text:
{
  "keywordAlignment": { "score": number, "feedback": "string" },
  "atsParseability": { "score": number, "feedback": "string" },
  "quantifiedAchievements": { "score": number, "feedback": "string" },
  "experienceDepth": { "score": number, "feedback": "string" },
  "jobTitleAlignment": { "score": number, "feedback": "string" },
  "qualifications": { "score": number, "feedback": "string" },
  "readabilityAndSummary": { "score": number, "feedback": "string" },
  "topFixes": ["string", "string"]
}

Category scoring guidance:
- keywordAlignment (25%): How well does the CV use the role's required vocabulary? Use the pre-computed keyword match data.
- atsParseability (15%): How cleanly will this parse through an ATS? Use the pre-computed signals. Factor in: standard headings present, contact info findable, no garbled text, consistent date formats.
- quantifiedAchievements (15%): Do bullet points include measurable scale/context — covers, guests, revenue, team size, property star rating?
- experienceDepth (15%): Does the work history show progression and sufficient tenure in roles relevant to cruise hospitality?
- jobTitleAlignment (10%): Do past job titles closely match the target role?
- qualifications (10%): Does the CV list relevant formal qualifications — food safety, bar certifications, hospitality management, POS system training? (Not seafarer certs.)
- readabilityAndSummary (10%): Is there a strong summary/profile paragraph? Is formatting clean and easy to scan in under 10 seconds?

topFixes: exactly 2 strings — the two highest-impact changes the candidate should make right now.`;

  const user = `ROLE: ${role.role}
ROLE SUMMARY: ${role.summary}
COMMON EXPERIENCE REQUIREMENTS: ${role.experienceRequirements.slice(0, 5).join('; ')}

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

Score this CV now.`;

  return { system, user };
}

// ─── Response parser ──────────────────────────────────────────────────────────

type RawCategory = { score: number; feedback: string };
export type RawLlmResponse = Record<CategoryKey, RawCategory> & { topFixes: string[] };

export function parseCvCheckResponse(raw: string): RawLlmResponse {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  const parsed = JSON.parse(cleaned) as RawLlmResponse;

  const required: CategoryKey[] = [
    'keywordAlignment',
    'atsParseability',
    'quantifiedAchievements',
    'experienceDepth',
    'jobTitleAlignment',
    'qualifications',
    'readabilityAndSummary',
  ];

  for (const key of required) {
    if (typeof parsed[key]?.score !== 'number') {
      throw new Error(`Missing or invalid category in LLM response: ${key}`);
    }
  }

  if (!Array.isArray(parsed.topFixes)) parsed.topFixes = [];

  return parsed;
}

// ─── Score computation (fully deterministic, no LLM) ─────────────────────────

function toTier(score: number): CvScoreResult['tier'] {
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
    tier: toTier(overallScore),
    categories,
    topFixes: parsed.topFixes.slice(0, 2),
    matchedKeywords,
    missingKeywords,
  };
}
