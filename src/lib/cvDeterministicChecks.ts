// cvDeterministicChecks.ts
// Pure functions for extracting structured signals from CV text.
// Run server-side before the LLM call; results feed into the prompt as context.

// @ts-ignore — JSON import
import SYNONYM_GROUPS from '@/data/hospitality-synonyms.json';

// Build a map: lowercase term → all other terms in its synonym group (lowercase)
function buildSynonymMap(groups: string[][]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const group of groups) {
    const lower = group.map((t) => t.toLowerCase());
    for (const term of lower) {
      map.set(term, lower.filter((t) => t !== term));
    }
  }
  return map;
}

const SYNONYM_MAP = buildSynonymMap(SYNONYM_GROUPS as string[][]);

export interface DeterministicSignals {
  hasContactInfo: boolean;
  hasSummarySection: boolean;
  headingsFound: string[];
  wordCount: number;
  quantifiedBulletCount: number;
  suspectGarbledText: boolean;
}

const HEADING_PATTERNS: { label: string; re: RegExp }[] = [
  { label: 'Experience', re: /\b(work\s+)?experience\b/i },
  { label: 'Education', re: /\beducation\b/i },
  { label: 'Skills', re: /\bskills\b/i },
  { label: 'Summary/Profile', re: /\b(summary|profile|objective|about\s+me)\b/i },
];

// Email address or phone number (7+ digits)
const CONTACT_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?[\d][\d\s\-(). ]{7,}\d/;

// Lines containing numbers with hospitality scale indicators
const QUANTIFIED_RE =
  /\d+\s*(%|guests?|covers?|seats?|rooms?|staff|team\s+of|members?|increase|revenue|sales|£|\$|€|beds?)/i;

// Very long run of lowercase letters without spaces = likely garbled merged text from bad PDF extraction
const GARBLED_RE = /[a-z]{25,}/;

export function runDeterministicChecks(cvText: string): DeterministicSignals {
  const lines = cvText.split(/\r?\n/);

  const headingsFound: string[] = [];
  for (const { label, re } of HEADING_PATTERNS) {
    if (re.test(cvText)) headingsFound.push(label);
  }

  return {
    hasContactInfo: CONTACT_RE.test(cvText),
    hasSummarySection: /\b(summary|profile|objective|about\s+me)\b/i.test(cvText),
    headingsFound,
    wordCount: cvText.trim().split(/\s+/).length,
    quantifiedBulletCount: lines.filter((l) => QUANTIFIED_RE.test(l)).length,
    suspectGarbledText: GARBLED_RE.test(cvText),
  };
}

export function scoreKeywordAlignment(
  cvText: string,
  roleKeywords: string[],
): { matchedKeywords: string[]; missingKeywords: string[]; matchRatio: number } {
  const lower = cvText.toLowerCase();
  const matched: string[] = [];
  const missing: string[] = [];

  for (const kw of roleKeywords) {
    const kwLower = kw.toLowerCase();
    if (lower.includes(kwLower)) {
      // Direct match
      matched.push(kw);
    } else {
      // Synonym match: check if any synonym from the same group appears in the CV.
      // Always use the original role keyword (not the synonym) in the returned list,
      // so the UI shows terms in the role's expected language.
      const synonyms = SYNONYM_MAP.get(kwLower) ?? [];
      const hasSynonymMatch = synonyms.some((s) => lower.includes(s));
      (hasSynonymMatch ? matched : missing).push(kw);
    }
  }

  const matchRatio = roleKeywords.length > 0 ? matched.length / roleKeywords.length : 0;
  // Cap missing list to 12 most useful to show in UI
  return { matchedKeywords: matched, missingKeywords: missing.slice(0, 12), matchRatio };
}
