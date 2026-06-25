// role-patterns.ts
// Maps cruise role slugs and free-text job titles to the closest hospitality
// pattern family, then returns the pattern data for AI prompt injection.
// Used server-side only (imported by builder-assist.ts).

// @ts-ignore — JSON import
import patternsRaw from '@/data/hospitality-patterns.json';

interface RoleFamily {
  label: string;
  matchTerms: string[];
  metrics: string[];
  promptGuidance: string;
  bulletTemplates: string[];
}

interface PatternsData {
  families: Record<string, RoleFamily>;
}

const patternsData = patternsRaw as PatternsData;

// ─── Slug → family map ─────────────────────────────────────────────────────────
// Maps every cruise-roles.json slug to the closest pattern family.
// Slugs not listed here have no pattern yet — they fall through to generic.

const SLUG_TO_FAMILY: Record<string, string> = {
  'waiter-waitress':                      'f-and-b-service',
  'buffet-attendant':                     'f-and-b-service',
  'bartender-bar-waiter':                 'bartending-sommelier',
  'cabin-steward-stewardess':             'housekeeping',
  'night-steward':                        'housekeeping',
  'galley-steward-kitchen-utility-dishwasher': 'galley-culinary',
  'commis-chef-cook':                     'galley-culinary',
  'guest-services-front-desk-agent':      'guest-services',
  'cruise-staff-activities':              'entertainment-youth',
  // No pattern family yet — will log as fallback for P1 prioritisation:
  // 'spa-therapist-beauty-attendant'
  // 'laundry-attendant'
  // 'provisions-storekeeper'
  // 'photographer'
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export type PatternSource = 'slug' | 'title-text' | 'none';

export interface PatternLookupResult {
  family: (RoleFamily & { familyKey: string }) | null;
  source: PatternSource;
  /** Populated when source === 'none' and a roleSlug was given but had no mapping */
  unmappedSlug?: string;
}

// ─── Slug-based lookup (primary) ───────────────────────────────────────────────

function getFamilyBySlug(roleSlug: string): (RoleFamily & { familyKey: string }) | null {
  const key = SLUG_TO_FAMILY[roleSlug];
  if (!key) return null;
  const family = patternsData.families[key];
  if (!family) return null;
  return { ...family, familyKey: key };
}

// ─── Title-text lookup (secondary fallback) ────────────────────────────────────

function getFamilyByTitle(jobTitle: string): (RoleFamily & { familyKey: string }) | null {
  if (!jobTitle || jobTitle.trim().length === 0) return null;

  const normalised = jobTitle.toLowerCase();

  for (const [key, family] of Object.entries(patternsData.families)) {
    for (const term of family.matchTerms) {
      if (normalised.includes(term.toLowerCase())) {
        return { ...family, familyKey: key };
      }
    }
  }

  return null;
}

// ─── Combined lookup with source tracking ──────────────────────────────────────

/**
 * Resolves the best pattern family for a given role context.
 *
 * Priority:
 * 1. targetRoleSlug (from CV checker or builder selector) — most reliable
 * 2. jobTitle text match — secondary fallback for builder-direct users
 * 3. null — generic prompt, no pattern injected
 *
 * Always returns a `source` field for logging/analytics.
 */
export function resolveRolePattern(
  targetRoleSlug: string | undefined,
  jobTitle: string | undefined,
): PatternLookupResult {
  // Primary: slug lookup
  if (targetRoleSlug && targetRoleSlug.trim().length > 0) {
    const family = getFamilyBySlug(targetRoleSlug);
    if (family) {
      return { family, source: 'slug' };
    }
    // Slug exists but has no pattern family yet — log for P1 expansion
    return { family: null, source: 'none', unmappedSlug: targetRoleSlug };
  }

  // Secondary: title-text matching
  if (jobTitle && jobTitle.trim().length > 0) {
    const family = getFamilyByTitle(jobTitle);
    if (family) {
      return { family, source: 'title-text' };
    }
    // Title provided but no match — career-changer or unrecognised title
    return { family: null, source: 'none' };
  }

  // No role context at all
  return { family: null, source: 'none' };
}

// ─── Prompt block builder ──────────────────────────────────────────────────────

/**
 * Builds the role-specific section to inject into the AI system prompt.
 * Returns an empty string when no pattern is found (graceful fallback).
 * Also returns structured log data for instrumentation.
 */
export function buildRolePatternBlock(
  targetRoleSlug: string | undefined,
  jobTitle: string | undefined,
): { block: string; log: PatternLookupResult } {
  const result = resolveRolePattern(targetRoleSlug, jobTitle);

  if (!result.family) {
    return { block: '', log: result };
  }

  const { family } = result;
  const metricsBlock = family.metrics.map((m) => `  - ${m}`).join('\n');
  const templatesBlock = family.bulletTemplates.map((t) => `  "${t}"`).join('\n');

  const block = `
ROLE-SPECIFIC PHRASING GUIDANCE (${family.label}):
${family.promptGuidance}

Relevant metric categories for this role:
${metricsBlock}

Reference bullet patterns (use these as structural models — do NOT copy them verbatim):
${templatesBlock}

PLACEHOLDER RULE: When the user has not provided a specific number for a metric, you MUST write it as a clearly marked placeholder using square brackets, e.g. [X covers/shift], [X%], [£X revenue]. Never invent a figure. If no metric context exists at all, omit that metric rather than fabricating one.`.trim();

  return { block, log: result };
}
