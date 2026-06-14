// cvDeterministicChecks.ts
// Pure functions for extracting structured signals from CV text.
// Run server-side before the LLM call; results feed into the prompt as context.

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
    (lower.includes(kw.toLowerCase()) ? matched : missing).push(kw);
  }

  const matchRatio = roleKeywords.length > 0 ? matched.length / roleKeywords.length : 0;
  // Cap missing list to 12 most useful to show in UI
  return { matchedKeywords: matched, missingKeywords: missing.slice(0, 12), matchRatio };
}
