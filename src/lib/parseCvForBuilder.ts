// parseCvForBuilder.ts
// Server function: extract CV text → AI router → structured ResumeData.
// Uses AiRouter (Groq primary → Gemini fallback) via the shared provider layer.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { ResumeData } from '@/types/resume';
import { createRouter } from '@/lib/ai/router';

const ParseCvSchema = z.object({ cvText: z.string().min(50) });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const parseCvForBuilder = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<ResumeData> => {
  const { cvText } = ParseCvSchema.parse(ctx.data);

  const router = createRouter({
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  });

  // Router calls adapter.extract() which uses CV_EXTRACT_SYSTEM_PROMPT and
  // validates via Zod boundary schema.  IDs are assigned inside the adapter.
  return router.extract(cvText);
});
