// parseCvForBuilder.ts
// Server function: extract CV text → Groq → structured ResumeData
// Uses the same Groq endpoint + ANTHROPIC_API_KEY convention as cruise-cv-check.ts

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { emptyResume } from '@/types/resume';
import type { ResumeData } from '@/types/resume';

const ParseCvSchema = z.object({ cvText: z.string().min(50) });

// Same ID convention as resume-store.ts uid()
const uid = () => Math.random().toString(36).slice(2, 10);

const WINE_LEVELS = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Sommelier'] as const;
const SPIRITS_LEVELS = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Mixologist'] as const;
const LANG_LEVELS = ['Basic', 'Conversational', 'Fluent', 'Native'] as const;

const SYSTEM_PROMPT = `You are a CV parser. Extract structured data from the provided CV text and return ONLY valid JSON — no markdown fences, no commentary.

Return exactly this JSON shape:
{
  "personal": {
    "fullName": "",
    "title": "",
    "email": "",
    "phone": "",
    "location": "",
    "links": [{ "label": "", "url": "" }]
  },
  "summary": "",
  "experience": [
    {
      "role": "",
      "venue": "",
      "location": "",
      "startDate": "",
      "endDate": "",
      "current": false,
      "description": ""
    }
  ],
  "education": [
    {
      "school": "",
      "degree": "",
      "field": "",
      "startDate": "",
      "endDate": "",
      "description": ""
    }
  ],
  "skills": [],
  "certifications": [
    {
      "name": "",
      "issuer": "",
      "year": ""
    }
  ],
  "hospitality": {
    "serviceStyles": [],
    "posSystems": [],
    "wineKnowledge": "None",
    "spiritsKnowledge": "None",
    "languages": [{ "name": "", "level": "Fluent" }],
    "allergens": false,
    "foodSafety": ""
  }
}

Strict rules:
- Extract ONLY information explicitly present in the CV. Never fabricate, infer, or fill in data not stated.
- Missing fields: use "" for strings, [] for arrays, false for booleans.
- experience startDate/endDate: "YYYY-MM" (e.g. "2021-03"). Year-only: "YYYY". Currently employed: current=true and endDate="".
- education startDate/endDate: "YYYY" if only year is known, "YYYY-MM" otherwise.
- skills: array of individual skill strings, 1–5 words each.
- wineKnowledge: one of exactly: "None","Beginner","Intermediate","Advanced","Sommelier" — use "None" if not mentioned.
- spiritsKnowledge: one of exactly: "None","Beginner","Intermediate","Advanced","Mixologist" — use "None" if not mentioned.
- languages[].level: one of exactly: "Basic","Conversational","Fluent","Native".
- serviceStyles: populate ONLY if the CV explicitly names service styles (fine dining, à la carte, banquet, etc.).
- posSystems: populate ONLY if POS system names appear in the CV (Toast, Micros, Lightspeed, etc.).
- allergens: true ONLY if allergen awareness training is explicitly mentioned.
- experience description: preserve the candidate's actual wording; light formatting cleanup only — do NOT rewrite.
- summary: use the candidate's actual profile/summary text verbatim.
- Do NOT include an "id" field — IDs will be assigned by the application.
- Respond with ONLY the JSON object.`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseCvForBuilder = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<ResumeData> => {
  const { cvText } = ParseCvSchema.parse(ctx.data);

  const groqKey = process.env.ANTHROPIC_API_KEY;
  if (!groqKey) throw new Error('ANTHROPIC_API_KEY (Groq key) is not configured');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 2500,
      temperature: 0.0,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Parse this CV:\n\n"""\n${cvText.slice(0, 8000)}\n"""` },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error ${response.status}: ${err}`);
  }

  const json = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error('No content in Groq response');

  return buildResumeData(content);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildResumeData(raw: string): ResumeData {
  const cleaned = raw.replace(/```json\s*|\s*```/g, '').trim();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn('[parseCvForBuilder] JSON parse failed — returning empty resume');
    return { ...emptyResume };
  }

  const safeStr = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
  const safeBool = (v: unknown): boolean => (typeof v === 'boolean' ? v : false);
  const safeStrArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string' && s.trim().length > 0) : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const p = (parsed.personal ?? {}) as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = (parsed.hospitality ?? {}) as any;

  return {
    personal: {
      fullName: safeStr(p.fullName),
      title: safeStr(p.title),
      email: safeStr(p.email),
      phone: safeStr(p.phone),
      location: safeStr(p.location),
      photo: undefined,
      links: Array.isArray(p.links)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? p.links.filter((l: any) => l?.label && l?.url).map((l: any) => ({ label: safeStr(l.label), url: safeStr(l.url) }))
        : [],
    },
    summary: safeStr(parsed.summary),
    experience: Array.isArray(parsed.experience)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? parsed.experience.map((e: any) => ({
          id: uid(),
          role: safeStr(e.role),
          venue: safeStr(e.venue),
          location: safeStr(e.location),
          startDate: safeStr(e.startDate),
          endDate: safeStr(e.endDate),
          current: safeBool(e.current),
          description: safeStr(e.description),
        }))
      : [],
    education: Array.isArray(parsed.education)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? parsed.education.map((e: any) => ({
          id: uid(),
          school: safeStr(e.school),
          degree: safeStr(e.degree),
          field: safeStr(e.field),
          startDate: safeStr(e.startDate),
          endDate: safeStr(e.endDate),
          description: safeStr(e.description),
        }))
      : [],
    skills: safeStrArr(parsed.skills),
    certifications: Array.isArray(parsed.certifications)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? parsed.certifications.map((c: any) => ({
          id: uid(),
          name: safeStr(c.name),
          issuer: safeStr(c.issuer),
          year: safeStr(c.year),
        }))
      : [],
    hospitality: {
      serviceStyles: safeStrArr(h.serviceStyles),
      posSystems: safeStrArr(h.posSystems),
      wineKnowledge: WINE_LEVELS.includes(h.wineKnowledge) ? h.wineKnowledge : 'None',
      spiritsKnowledge: SPIRITS_LEVELS.includes(h.spiritsKnowledge) ? h.spiritsKnowledge : 'None',
      languages: Array.isArray(h.languages)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? h.languages.filter((l: any) => safeStr(l?.name)).map((l: any) => ({
            name: safeStr(l.name),
            level: LANG_LEVELS.includes(l.level) ? l.level : 'Fluent',
          }))
        : [],
      allergens: safeBool(h.allergens),
      foodSafety: safeStr(h.foodSafety),
    },
    // Preserve the user's current template — the CV text contains no template preference
    templateId: 'classic',
  };
}
