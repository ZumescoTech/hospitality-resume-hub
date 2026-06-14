import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import {
  buildCvCheckPrompt,
  parseCvCheckResponse,
  computeCvScore,
  type CruiseRolesData,
  type CvScoreResult,
} from '@/lib/cruiseCvRubric';
import { runDeterministicChecks, scoreKeywordAlignment } from '@/lib/cvDeterministicChecks';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

const CvCheckSchema = z.object({
  cvText: z.string().min(50, 'CV text must be at least 50 characters'),
  roleSlug: z.string().min(1, 'Role is required'),
  jobDescription: z.string().optional(),
});

const SaveLeadSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleSlug: z.string(),
  overallScore: z.number(),
  tier: z.enum(['Strong', 'Good', 'Needs Work', 'Major Gaps']),
  topFixes: z.array(z.string()),
});

export type CvCheckInput = z.infer<typeof CvCheckSchema>;
export type SaveLeadInput = z.infer<typeof SaveLeadSchema>;

// ─── CV check ─────────────────────────────────────────────────────────────────
// Uses Groq (llama-3.3-70b-versatile) via OpenAI-compatible endpoint.
// ANTHROPIC_API_KEY env var holds the Groq key for historical reasons.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkCruiseCv = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<CvScoreResult> => {
  const parsed = CvCheckSchema.parse(ctx.data as CvCheckInput);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);

  const groqKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey) throw new Error('ANTHROPIC_API_KEY (Groq key) is not configured');

  // 1. Deterministic signals
  const signals = runDeterministicChecks(parsed.cvText);

  // 2. Keyword alignment
  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(
    parsed.cvText,
    role.keywords,
    parsed.jobDescription,
  );

  // 3. Build prompt
  const { system, user } = buildCvCheckPrompt({
    cvText: parsed.cvText,
    role,
    signals,
    matchedKeywords,
    missingKeywords,
    matchRatio,
    jobDescription: parsed.jobDescription,
  });

  // 4. Call Groq
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in Groq response');

  // 5. Parse LLM output + compute final score deterministically
  const llmParsed = parseCvCheckResponse(content);
  return computeCvScore(llmParsed, matchedKeywords, missingKeywords);
});

// ─── Save lead to Google Sheets via Apps Script webhook ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveCvLead = createServerFn({ method: 'POST' }).handler(async (ctx: any) => {
  const parsed = SaveLeadSchema.parse(ctx.data as SaveLeadInput);

  const webhookUrl = process.env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL;
  if (!webhookUrl) return { ok: true };

  const roleName = rolesData.roles.find((r) => r.slug === parsed.roleSlug)?.role ?? parsed.roleSlug;

  const payload = JSON.stringify({
    email: parsed.email,
    role_slug: parsed.roleSlug,
    role_name: roleName,
    overall_score: parsed.overallScore,
    tier: parsed.tier,
    top_fixes: parsed.topFixes.join(' | '),
    submitted_at: new Date().toISOString(),
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
