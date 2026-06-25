// phrasing-chips.ts
// Server function that returns role-specific bullet template chips for the
// AI phrasing chip UI in ExperienceSection. Wraps the existing resolveRolePattern
// engine — does not change prompt logic or add new AI calls.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { resolveRolePattern } from '@/lib/ai/role-patterns';

// Generic fallback chips shown when no role family can be resolved.
// Written in the same [PLACEHOLDER] style as the pattern library.
const GENERIC_CHIPS: string[] = [
  "Delivered attentive, [service style] service across [X] covers per shift in a fast-paced hospitality environment.",
  "Maintained [X/5] guest satisfaction score consistently across [X] consecutive service periods.",
  "Collaborated with FOH and BOH teams to ensure seamless, efficient service during peak periods.",
  "Trained and supported [X] junior team members in service standards and operational procedures.",
  "Contributed to a [X%] improvement in table turn efficiency through proactive team communication.",
];

const Schema = z.object({
  roleSlug: z.string().optional(),
  jobTitle: z.string().optional(),
});

export interface ChipsResult {
  /** Full pool of bullet templates (up to 5). Client rotates which 3 are shown. */
  chips: string[];
  /** Human-readable role family label, e.g. "F&B Service". Null when using generic fallback. */
  roleLabel: string | null;
}

/**
 * Returns the bullet template pool for a given role context.
 * Priority: targetRoleSlug → jobTitle text match → generic fallback.
 * Returns all templates (≤5); the client chooses which 3 to display.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getPhrasingChipsFn = createServerFn({ method: 'POST' }).handler(
  async (ctx: any): Promise<ChipsResult> => {
    const { roleSlug, jobTitle } = Schema.parse(ctx.data);
    const result = resolveRolePattern(roleSlug, jobTitle);

    if (!result.family) {
      return { chips: GENERIC_CHIPS, roleLabel: null };
    }

    return {
      chips: result.family.bulletTemplates,
      roleLabel: result.family.label,
    };
  },
);
