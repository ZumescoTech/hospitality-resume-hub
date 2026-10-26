// tailor-cv.ts
// Whole-CV tailoring to a pasted job ad ("Customise CV to this job").
// Pure helpers: prompt building, response validation, and merging the AI
// rewrite back into ResumeData. The server function lives in builder-assist.ts.
//
// Trust rules (enforced in code, not only in the prompt):
//   - Only the summary and existing experience bullets are rewritten.
//     Employers, roles, dates, education and certifications are never touched.
//   - Any number the AI writes that is not already in the user's CV is
//     replaced with an [X] placeholder for the user to fill in.
//   - Suggested skills are returned separately for the user to opt into;
//     they are never added to the CV automatically.

import { z } from 'zod';
import type { Experience, ResumeData } from '@/types/resume';

export interface TailorCvInput {
  jobDescription: string;
  jobTitle: string;
  targetRoleSlug?: string;
  summary: string;
  skills: string[];
  experience: Array<{ id: string; role: string; venue: string; bullets: string[] }>;
}

export interface TailorCvResult {
  summary: string;
  experience: Array<{ id: string; bullets: string[] }>;
  suggestedSkills: string[];
}

const MAX_BULLETS = 8;

export const tailorCvResponseSchema = z.object({
  summary: z.string(),
  experience: z
    .array(z.object({ id: z.string(), bullets: z.array(z.string()).max(MAX_BULLETS) }))
    .default([]),
  suggestedSkills: z.array(z.string()).default([]),
});

export const TAILOR_CV_SYSTEM =
  `You are an expert CV editor for the cruise ship and luxury hospitality industry. ` +
  `Rewrite the candidate's professional summary and experience bullets so they match ` +
  `the job ad: mirror its keywords (systems, certifications, service styles) where the ` +
  `candidate's existing text supports them, lead with the most relevant achievements, ` +
  `and use action verb + task context + result. ` +
  `Only rephrase and re-emphasise information already present. ` +
  `NEVER invent employers, job titles, dates, certifications, systems or numbers. ` +
  `If a metric would help but the candidate did not state it, write a square-bracket ` +
  `placeholder such as [X covers/shift] or [X%]. ` +
  `Keep every experience entry, in the same order, using the same id. ` +
  `At most ${MAX_BULLETS} bullets per entry. ` +
  `Skills the ad asks for that the candidate did not list go ONLY in suggestedSkills — ` +
  `never into the summary or bullets. ` +
  `Return ONLY valid JSON, no markdown fences: ` +
  `{"summary": "...", "experience": [{"id": "...", "bullets": ["..."]}], "suggestedSkills": ["..."]}`;

/** Bullets for an entry, falling back to its free-text description. */
export function entryBullets(exp: Experience): string[] {
  if (exp.bullets && exp.bullets.length > 0) return exp.bullets.filter((b) => b.trim());
  return exp.description?.trim() ? [exp.description.trim()] : [];
}

export function buildTailorInput(data: ResumeData): TailorCvInput {
  return {
    jobDescription: data.targetJobDescription ?? '',
    jobTitle: data.personal.title ?? '',
    targetRoleSlug: data.targetRoleSlug,
    summary: data.summary ?? '',
    skills: data.skills ?? [],
    experience: data.experience.map((e) => ({
      id: e.id,
      role: e.role,
      venue: e.venue,
      bullets: entryBullets(e),
    })),
  };
}

export function buildTailorUserPrompt(input: TailorCvInput): string {
  const experience = input.experience
    .map((e) => `- id: ${e.id}\n  role: ${e.role} at ${e.venue}\n  bullets:\n${e.bullets.map((b) => `    * ${b}`).join('\n') || '    (none)'}`)
    .join('\n');
  return [
    `Target job title: ${input.jobTitle || 'hospitality professional'}`,
    `Job ad:\n"""\n${input.jobDescription.slice(0, 3000)}\n"""`,
    `Current skills: ${input.skills.join(', ') || '(none)'}`,
    `Current summary:\n"""\n${input.summary || '(empty)'}\n"""`,
    `Experience entries:\n${experience || '(none)'}`,
  ].join('\n\n');
}

// ─── Number guard ─────────────────────────────────────────────────────────────

const NUMBER_RE = /\d+(?:[.,]\d+)*/g;

function numbersIn(text: string): Set<string> {
  return new Set(text.match(NUMBER_RE) ?? []);
}

/** Replace any number not present in `source` with an [X] placeholder. */
export function guardNumbers(text: string, source: string): string {
  const allowed = numbersIn(source);
  return text.replace(NUMBER_RE, (n) => (allowed.has(n) ? n : '[X]'));
}

function cleanBullet(b: string): string {
  return b.replace(/^\s*[-•*·]\s*/, '').trim();
}

/** Parse + validate a raw LLM response. Throws on malformed output. */
export function parseTailorResponse(raw: string): TailorCvResult {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();
  return tailorCvResponseSchema.parse(JSON.parse(cleaned));
}

/**
 * Merge a validated AI rewrite into the CV. Unknown ids are ignored, empty
 * rewrites keep the original, and invented numbers become [X].
 */
export function applyTailoring(data: ResumeData, result: TailorCvResult): ResumeData {
  const fullSource = [
    data.summary,
    data.personal.title,
    ...data.experience.flatMap((e) => [e.role, e.venue, ...entryBullets(e)]),
    ...data.skills,
    ...data.certifications.map((c) => `${c.name} ${c.issuer ?? ''}`),
  ].join(' ');

  const byId = new Map(result.experience.map((e) => [e.id, e]));

  const experience = data.experience.map((exp) => {
    const rewrite = byId.get(exp.id);
    const bullets = (rewrite?.bullets ?? []).map(cleanBullet).filter(Boolean);
    if (bullets.length === 0) return exp;
    const source = [exp.role, exp.venue, ...entryBullets(exp)].join(' ');
    return { ...exp, bullets: bullets.map((b) => guardNumbers(b, source)) };
  });

  const summary = result.summary.trim() ? guardNumbers(result.summary.trim(), fullSource) : data.summary;

  return { ...data, summary, experience };
}

/** Suggested skills the user does not already list (case-insensitive). */
export function newSuggestedSkills(data: ResumeData, result: TailorCvResult): string[] {
  const have = new Set(data.skills.map((s) => s.trim().toLowerCase()));
  return [...new Set(result.suggestedSkills.map((s) => s.trim()).filter(Boolean))]
    .filter((s) => !have.has(s.toLowerCase()))
    .slice(0, 8);
}
