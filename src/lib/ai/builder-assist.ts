// builder-assist.ts
// Server functions for the two AI assistance layers in the Plate & Pen builder.
// Both call Groq llama-3.3-70b-versatile via the OpenAI-compatible endpoint.
// ANTHROPIC_API_KEY holds the Groq key following the project convention.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { buildRolePatternBlock } from '@/lib/ai/role-patterns';

// ─── Shared types (exported for client components) ─────────────────────────────

export interface WritingSuggestion {
  original_substring: string;
  suggested_substring: string;
  type: 'spelling' | 'grammar';
}

export interface TailorResult {
  rewrittenText: string;
  suggestedSkills: string[];
}

// ─── Schemas ───────────────────────────────────────────────────────────────────

const CheckWritingSchema = z.object({
  text: z.string(),
  fieldType: z.string(),
});

const TailorContentSchema = z.object({
  fieldType: z.string(),
  currentText: z.string(),
  jobTitle: z.string(),
  jobDescription: z.string().optional(),
  otherContext: z.string().optional(),
  /** Primary role signal — cruise-roles.json slug from CV checker or builder selector */
  targetRoleSlug: z.string().optional(),
});

// ─── System prompts ────────────────────────────────────────────────────────────

const HOSPITALITY_JARGON =
  'mise en place, F&B, POS, sommelier, sous chef, chef de partie, commis, ' +
  "garde manger, maitre d', maître d', demi-chef, tournant, brigade, " +
  "amuse-bouche, à la carte, prix fixe, table d'hôte, WSET, CMS, FOH, BOH, " +
  'barback, flair, upselling, covers, pre-shift, par level, sidework, expo, ' +
  'busser, Toast, Micros, Lightspeed, Aloha, Resy, OpenTable, TIPS, ServSafe, ' +
  'HACCP, degustation, aperitif, digestif, flambé, charcuterie, barista, ' +
  'deuce, four-top, tasting menu, prix-fixe, mise, intermezzo, sommelier, ' +
  'wine pairing, cellar management, spirit, cocktail, mixology, flair';

const CHECK_WRITING_SYSTEM =
  `Find spelling and grammar errors only in this CV text. ` +
  `Do not flag industry jargon: ${HOSPITALITY_JARGON}. ` +
  `Return ONLY a JSON array of {original_substring, suggested_substring, type: 'spelling'|'grammar'}. ` +
  `No explanations, no markdown fences. Empty array [] if no issues.`;

// Base system prompt — role-specific pattern block is appended per-request in tailorContentFn.
const TAILOR_SYSTEM_BASE =
  `You are an expert CV editor for the cruise ship and luxury hospitality industry. ` +
  `Only rephrase and re-emphasise information already present in the provided text. ` +
  `CRITICAL RULE — NEVER INVENT NUMBERS: If the user has not stated a specific figure ` +
  `(count, percentage, revenue amount, team size, rating), you MUST use a clearly marked ` +
  `square-bracket placeholder, e.g. [X covers/shift], [X%], [£X revenue], [X team members]. ` +
  `Do not silently omit the metric — leave the placeholder so the user can fill it in. ` +
  `Never invent employers, job titles, dates, or certifications not stated by the user. ` +
  `Structure experience bullets as: action verb + task context + quantifiable result. ` +
  `You may suggest relevant skills as a SEPARATE list for the user to opt into — ` +
  `never merge new claims into the rewritten text itself. ` +
  `Return ONLY valid JSON with no markdown fences: ` +
  `{"rewrittenText": "...", "suggestedSkills": ["skill1", "skill2"]}`;

// ─── Layer 1: checkWritingFn ───────────────────────────────────────────────────
// Groq llama-3.3-70b — spelling and grammar only.
// Returns [] on any error (fail-silently contract).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const checkWritingFn = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<WritingSuggestion[]> => {
  const { text, fieldType } = CheckWritingSchema.parse(ctx.data);
  if (text.trim().length < 10) return [];

  const groqKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 400,
        temperature: 0.0,
        messages: [
          { role: 'system', content: CHECK_WRITING_SYSTEM },
          { role: 'user', content: `Check this CV ${fieldType} text:\n\n"""${text}"""` },
        ],
      }),
    });

    if (!response.ok) return [];

    const json = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    const content = json.choices?.[0]?.message?.content ?? '';
    const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();
    const parsed: unknown = JSON.parse(cleaned);

    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (s): s is WritingSuggestion =>
        s !== null &&
        typeof s === 'object' &&
        typeof (s as WritingSuggestion).original_substring === 'string' &&
        typeof (s as WritingSuggestion).suggested_substring === 'string' &&
        ((s as WritingSuggestion).type === 'spelling' || (s as WritingSuggestion).type === 'grammar'),
    );
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
});

// ─── Layer 2: tailorContentFn ─────────────────────────────────────────────────
// Groq llama-3.3-70b — role-aligned content tailoring.
// Throws on API errors (caller shows UI feedback).

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const tailorContentFn = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<TailorResult> => {
  const { fieldType, currentText, jobTitle, jobDescription, otherContext, targetRoleSlug } =
    TailorContentSchema.parse(ctx.data);

  const groqKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey) throw new Error('AI key not configured');

  // Select role-specific pattern: targetRoleSlug (primary) → jobTitle text match (fallback)
  const { block: rolePatternBlock, log: patternLog } = buildRolePatternBlock(
    targetRoleSlug,
    jobTitle,
  );

  // Structured instrumentation log — anonymised (no CV content, no PII)
  // Captures: which pattern family was selected, detection source, and any unmapped slugs
  // for P1 expansion prioritisation.
  console.info('[ai-phrasing] pattern_selected', {
    familyKey: patternLog.family?.familyKey ?? null,
    source: patternLog.source,
    // Log unmapped slugs so we know which roles hit generic fallback most (P1 data)
    unmappedSlug: patternLog.unmappedSlug ?? null,
    // Distinguish "no role context" from "role given but no match"
    fallbackReason: patternLog.family
      ? null
      : targetRoleSlug
        ? 'slug_not_mapped'
        : jobTitle
          ? 'title_no_match'
          : 'no_role_context',
    fieldType,
  });

  const systemPrompt = rolePatternBlock
    ? `${TAILOR_SYSTEM_BASE}\n\n${rolePatternBlock}`
    : TAILOR_SYSTEM_BASE;

  const userParts = [
    `Field type: ${fieldType}`,
    `Target job title: ${jobTitle || 'hospitality professional'}`,
    jobDescription
      ? `Job description:\n"""\n${jobDescription.slice(0, 1500)}\n"""`
      : null,
    otherContext
      ? `Other experience entries (for context — avoid repeating the same phrasing):\n${otherContext}`
      : null,
    `\nText to tailor:\n"""\n${currentText}\n"""`,
  ].filter(Boolean) as string[];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      temperature: 0.3,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userParts.join('\n\n') },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const content = json.choices?.[0]?.message?.content ?? '';
  const cleaned = content.replace(/```json\s*|\s*```/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as { rewrittenText?: string; suggestedSkills?: unknown };
    return {
      rewrittenText:
        typeof parsed.rewrittenText === 'string' && parsed.rewrittenText.trim()
          ? parsed.rewrittenText
          : currentText,
      suggestedSkills: Array.isArray(parsed.suggestedSkills)
        ? (parsed.suggestedSkills as unknown[]).filter(
            (s): s is string => typeof s === 'string' && s.trim().length > 0,
          )
        : [],
    };
  } catch {
    return { rewrittenText: currentText, suggestedSkills: [] };
  }
});
