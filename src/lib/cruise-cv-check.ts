import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { buildCvCheckPrompt, parseCvCheckResponse, type CruiseRolesData } from '@/lib/cruiseCvRubric';
// @ts-ignore — JSON import
import cruiseRolesRaw from '@/data/cruise-roles.json';

const rolesData = cruiseRolesRaw as CruiseRolesData;

const CvCheckSchema = z.object({
  cvText: z.string().min(50, 'CV text must be at least 50 characters'),
  roleSlug: z.string().min(1, 'Role is required'),
  jobAdText: z.string().optional(),
});

const SaveLeadSchema = z.object({
  email: z.string().email('Invalid email address'),
  roleSlug: z.string(),
  overall_score: z.number(),
  risk_level: z.enum(['high', 'medium', 'low']),
  top_issues: z.array(z.string()),
  categories: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      status: z.enum(['pass', 'warning', 'fail']),
      feedback: z.string(),
      fix: z.string(),
    }),
  ),
});

export type CvCheckInput = z.infer<typeof CvCheckSchema>;
export type SaveLeadInput = z.infer<typeof SaveLeadSchema>;

// ─── CV check via Groq (llama-3.3-70b-versatile) ─────────────────────────────
// The env var is named ANTHROPIC_API_KEY for compatibility but holds a Groq key.
// Groq exposes an OpenAI-compatible endpoint, so we use it directly via fetch.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkCruiseCv = createServerFn({ method: 'POST' }).handler(async (ctx: any) => {
  const parsed = CvCheckSchema.parse(ctx.data as CvCheckInput);
  const role = rolesData.roles.find((r) => r.slug === parsed.roleSlug);
  if (!role) throw new Error(`Unknown role: ${parsed.roleSlug}`);

  const groqKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey) throw new Error('ANTHROPIC_API_KEY (Groq key) is not configured');

  const { system, user } = buildCvCheckPrompt({
    cvText: parsed.cvText,
    role,
    jobAdText: parsed.jobAdText,
  });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2000,
      temperature: 0.2,
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

  return parseCvCheckResponse(content);
});

// ─── Save lead to Google Sheets via Apps Script webhook ───────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const saveCvLead = createServerFn({ method: 'POST' }).handler(async (ctx: any) => {
  const parsed = SaveLeadSchema.parse(ctx.data as SaveLeadInput);

  const webhookUrl = process.env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL;
  if (!webhookUrl) {
    // Silently skip if not configured
    return { ok: true };
  }

  const roleName =
    rolesData.roles.find((r) => r.slug === parsed.roleSlug)?.role ?? parsed.roleSlug;

  const payload = JSON.stringify({
    email: parsed.email,
    role_slug: parsed.roleSlug,
    role_name: roleName,
    overall_score: parsed.overall_score,
    risk_level: parsed.risk_level,
    top_issues: parsed.top_issues.join(' | '),
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
