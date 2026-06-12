// cruiseCvRubric.ts
//
// Combines the general "cruise hotel CV" rubric (things that apply to every
// hotel-department role) with the per-role reference data scraped into
// cruise-roles.json, to build a single prompt for Claude Haiku.
//
// Drop this file anywhere in your server-side code (e.g. src/lib/) and
// import buildCvCheckPrompt + types into your API route handler.

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

// --- General rubric: applies to every hotel-department cruise role ---
// These are the "instant regret" triggers that aren't role-specific.
export const GENERAL_RUBRIC_CATEGORIES = [
  {
    id: "personal_info_block",
    name: "Personal Information Block",
    check:
      "Does the CV include date of birth, nationality, marital status, and passport validity? " +
      "Cruise recruiters expect this block near the top — its absence reads as 'not maritime-ready' " +
      "even to an experienced hospitality candidate.",
  },
  {
    id: "certifications",
    name: "Seafarer Certifications",
    check:
      "Does the CV mention STCW Basic Safety Training, ENG1 Medical Certificate, and/or Seaman's " +
      "Discharge Book status? Cross-reference against the role-specific 'certifications' list below — " +
      "flag any commonly-required certs that are missing.",
  },
  {
    id: "photo",
    name: "Professional Photo",
    check:
      "Is there a photo on the CV? If an image is present, briefly note whether it looks like a " +
      "professional headshot (neutral background, business attire, smiling) vs. a casual/cropped photo.",
  },
  {
    id: "quantified_experience",
    name: "Quantified Experience Context",
    check:
      "For each past role, does the CV give scale/context a recruiter unfamiliar with the employer " +
      "would need — e.g. covers per service, number of rooms/beds, star rating, type of service " +
      "(plate/silver service)? Generic 'Worked as a waiter at X' with no context is a red flag.",
  },
  {
    id: "languages",
    name: "Language Proficiency",
    check:
      "Are languages listed with proficiency levels (fluent/intermediate/basic)? Compare against the " +
      "role's language requirements below.",
  },
  {
    id: "cover_letter",
    name: "Cover Letter",
    check:
      "Was a cover letter provided alongside the CV? Many cruise recruiters reject on a missing or " +
      "weak cover letter even when the CV itself is strong.",
  },
  {
    id: "availability_statement",
    name: "Contract Availability Statement",
    check:
      "Does the CV state availability for long contracts (e.g. 6-9 months) and willingness to share " +
      "a cabin? Absence of this is a minor but common gap.",
  },
  {
    id: "structure_length",
    name: "Structure & Length",
    check:
      "Is the CV 1-2 pages, well-organized, and easy to scan? Overly long, dense, or poorly formatted " +
      "CVs get skipped in high-volume screening.",
  },
  {
    id: "keyword_match",
    name: "Role Keyword Match",
    check:
      "Compare the CV's language against the role's master keyword list (and the job ad, if provided). " +
      "Flag important missing keywords that an ATS would scan for.",
  },
] as const;

// --- Prompt builder ---

export interface BuildPromptInput {
  cvText: string;
  role: CruiseRole;
  jobAdText?: string;
}

export function buildCvCheckPrompt({ cvText, role, jobAdText }: BuildPromptInput): {
  system: string;
  user: string;
} {
  const system = `You are an expert cruise ship hotel-department recruiter screening CVs for the role of "${role.role}".
You evaluate CVs the way real cruise line / crewing agency recruiters do during a fast, high-volume screening pass.

Respond with ONLY valid JSON matching this exact schema, no other text, no markdown fences:

{
  "overall_score": number (0-100),
  "risk_level": "high" | "medium" | "low",
  "categories": [
    {
      "id": string,
      "name": string,
      "status": "pass" | "warning" | "fail",
      "feedback": string,
      "fix": string
    }
  ],
  "top_issues": string[] (2-4 items, most important first)
}

Evaluate every category listed below. For each, set status to "fail" if the issue would likely cause an
instant rejection, "warning" if it's a missed opportunity but not disqualifying, and "pass" if it's
handled well. "feedback" should explain what you found and why it matters to a cruise recruiter.
"fix" should be a specific, actionable instruction the candidate can follow.

General categories to evaluate:
${GENERAL_RUBRIC_CATEGORIES.map((c) => `- ${c.id} ("${c.name}"): ${c.check}`).join("\n")}

Role-specific reference data for "${role.role}":
- Role summary: ${role.summary}
- Common experience requirements seen in real job postings:
${role.experienceRequirements.map((r) => `  - ${r}`).join("\n")}
- Common CV expectations seen in real job postings:
${role.cvExpectations.map((r) => `  - ${r}`).join("\n")}
- Certifications commonly required for this role:
${role.certifications.map((r) => `  - ${r}`).join("\n")}
- Language requirements: ${role.languages}
- Master keyword list for ATS matching: ${role.keywords.join(", ")}
${jobAdText ? `\nThe candidate also provided a specific job ad they're applying to. Add an extra category with id "job_ad_match" comparing the CV against this job ad's specific language and requirements, in addition to the general role data above.` : ""}`;

  const user = `CANDIDATE CV TEXT:
"""
${cvText}
"""
${
  jobAdText
    ? `\nJOB AD TEXT THE CANDIDATE IS APPLYING TO:
"""
${jobAdText}
"""`
    : ""
}

Evaluate this CV now and return the JSON response.`;

  return { system, user };
}

// --- Response type, for parsing the Haiku output ---

export interface CvCheckCategoryResult {
  id: string;
  name: string;
  status: "pass" | "warning" | "fail";
  feedback: string;
  fix: string;
}

export interface CvCheckResult {
  overall_score: number;
  risk_level: "high" | "medium" | "low";
  categories: CvCheckCategoryResult[];
  top_issues: string[];
}

export function parseCvCheckResponse(raw: string): CvCheckResult {
  // Strip markdown fences if the model adds them despite instructions
  const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
  const parsed = JSON.parse(cleaned);

  if (
    typeof parsed.overall_score !== "number" ||
    !Array.isArray(parsed.categories) ||
    !Array.isArray(parsed.top_issues)
  ) {
    throw new Error("Unexpected CV check response shape");
  }

  return parsed as CvCheckResult;
}
