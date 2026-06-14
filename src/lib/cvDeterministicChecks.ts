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

// ─── Job description keyword extractor ────────────────────────────────────────

const JD_STOPWORDS = new Set([
  'the','and','or','in','of','to','a','an','for','with','on','at','by','from',
  'as','is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','may','might','shall','this','that','these',
  'those','we','you','our','your','their','its','all','any','each','some','such',
  'not','no','but','if','so','yet','both','either','neither','nor','about',
  'above','after','before','between','during','through','under','while','within',
  'without','including','required','preferred','experience','years','ability',
  'skills','work','team','position','role','candidate','company','opportunity',
  'job','apply','application','responsibilities','requirements','qualification',
  'excellent','strong','good','great','demonstrated','proven','hands','also',
  'well','must','can','please','ensure','maintain','assist','support',
  'key','level','high','new','use','used','using','per','etc',
]);

function extractJobDescriptionKeywords(text: string): string[] {
  const lower = text.toLowerCase().replace(/[•\-–—·*►▸]+/g, ' ');
  const words = lower.replace(/[^\w\s&/]/g, ' ').split(/\s+/).filter(Boolean);

  const seen = new Set<string>();
  const result: string[] = [];

  // Bigrams first (more specific → more likely to be real skills)
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    if (a.length >= 3 && b.length >= 3 && !JD_STOPWORDS.has(a) && !JD_STOPWORDS.has(b)) {
      const bigram = `${a} ${b}`;
      if (!seen.has(bigram)) { seen.add(bigram); result.push(bigram); }
    }
  }

  // Unigrams (4+ chars, not stopwords)
  for (const w of words) {
    if (w.length >= 4 && !JD_STOPWORDS.has(w) && !seen.has(w)) {
      seen.add(w); result.push(w);
    }
  }

  // Limit to 25 terms to avoid diluting the match ratio
  return result.slice(0, 25);
}

// ─── Keyword alignment ────────────────────────────────────────────────────────

export function scoreKeywordAlignment(
  cvText: string,
  roleKeywords: string[],
  jobDescription?: string,
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

  // matchRatio is based solely on role keywords — unaffected by JD terms
  const matchRatio = roleKeywords.length > 0 ? matched.length / roleKeywords.length : 0;

  // JD bonus pool: JD-extracted terms found in the CV are added to matchedKeywords
  // (boosting what the LLM sees). Unmatched JD terms are silently dropped — no penalty.
  if (jobDescription?.trim()) {
    const roleSet = new Set(roleKeywords.map((k) => k.toLowerCase()));
    const alreadyMatched = new Set(matched.map((k) => k.toLowerCase()));
    for (const jdKw of extractJobDescriptionKeywords(jobDescription)) {
      if (roleSet.has(jdKw) || alreadyMatched.has(jdKw)) continue;
      if (lower.includes(jdKw)) {
        matched.push(jdKw);
        alreadyMatched.add(jdKw);
      }
    }
  }

  // Cap missing list to 12 most useful to show in UI
  return { matchedKeywords: matched, missingKeywords: missing.slice(0, 12), matchRatio };
}
