// normalize.ts
// Shared, pure text-normalisation and term-matching primitives for the local
// deterministic CV pre-checker. Imported by BOTH the build-time aggregator
// (scripts/build-precheck-termbanks.ts) and the runtime scorer
// (src/lib/precheck/prechecker.ts) so that a term is counted at build time in
// exactly the same way it is matched at scoring time. No Node/browser APIs —
// safe to run inside a Cloudflare Worker.

/**
 * Canonical form of a piece of text for matching:
 *  - lowercased
 *  - hyphens / slashes / underscores become spaces, so "turn-down",
 *    "turn/down" and "turn down" collapse to the same tokens, and "4-star"
 *    becomes "4 star"
 *  - everything except [a-z0-9& ] is dropped ("&" kept for "f&b")
 *  - runs of whitespace collapse to a single space; trimmed
 *
 * The result contains only single-space-separated tokens drawn from
 * [a-z0-9&], which lets `termInText` do whole-token matching with plain string
 * containment instead of fragile regex escaping.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[-/_]+/g, ' ')
    .replace(/[^a-z0-9& ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Split already-normalised text into tokens. */
export function tokenize(normalized: string): string[] {
  return normalized.length === 0 ? [] : normalized.split(' ');
}

/**
 * British → American spelling fold (whole-token). Applied symmetrically to CV
 * text and bank terms so "programme"/"organise"/"5-star colour" don't read as
 * gaps. Explicit whole-word map (not a blanket -ise→-ize rule) to avoid
 * mangling words like "exercise" or "franchise". Plurals are covered by
 * applying the fold again after suffix-stripping.
 */
const SPELLING_FOLD: Record<string, string> = {
  programme: 'program', programmes: 'program', colour: 'color', colours: 'color',
  favour: 'favor', favourite: 'favorite', behaviour: 'behavior', organise: 'organize',
  organised: 'organized', organising: 'organizing', organisation: 'organization',
  recognise: 'recognize', specialise: 'specialize', specialised: 'specialized',
  prioritise: 'prioritize', centre: 'center', metre: 'meter', litre: 'liter',
  theatre: 'theater', licence: 'license', defence: 'defense', catalogue: 'catalog',
  travelling: 'traveling', travelled: 'traveled', cancelled: 'canceled',
  labelled: 'labeled', enrol: 'enroll', fulfil: 'fulfill', jewellery: 'jewelry',
  judgement: 'judgment', practise: 'practice', analyse: 'analyze', grey: 'gray',
};

/**
 * Conservative morphological stemmer for a single token: folds common English
 * plural and verb inflections so "clean"/"cleaning"/"cleaned"/"cleans",
 * "guest"/"guests", "policy"/"policies", "activity"/"activities" all collapse
 * to one match key, plus British/American spelling. Deliberately light (no
 * Porter over-stemming) — it only strips -ing/-ed/-ies/-s. The produced stem is
 * a MATCH KEY, never shown to users (display strings keep their surface form).
 */
export function stemToken(token: string): string {
  let t = SPELLING_FOLD[token] ?? token;
  if (t.length <= 3) return t; // don't mangle short tokens (bls, cpr, spa)
  if (t.endsWith('ing') && t.length > 5) t = t.slice(0, -3);
  else if (t.endsWith('ed') && t.length > 4) t = t.slice(0, -2);
  else if (t.endsWith('ies') && t.length > 4) t = `${t.slice(0, -3)}y`;
  else if (t.endsWith('sses')) t = t.slice(0, -2);
  else if (t.endsWith('s') && !t.endsWith('ss') && t.length > 3) t = t.slice(0, -1);
  return SPELLING_FOLD[t] ?? t; // fold again post-strip (programmes→programme→program)
}

/** Stem every token of already-normalised text and rejoin. */
export function stemPhrase(normalized: string): string {
  return tokenize(normalized).map(stemToken).join(' ');
}

/** Normalise + stem in one step — the canonical match form. */
export function stemText(raw: string): string {
  return stemPhrase(normalizeText(raw));
}

/**
 * Whole-token(-sequence) containment. Both arguments MUST already be
 * normalised via `normalizeText`. Because normalised text is single-space
 * separated, padding both sides with a space turns word-boundary matching into
 * a substring test:
 *   " guest satisfaction " ∈ " ... the guest satisfaction score ... "  → true
 *   " micros "             ∉ " ... using microscope ... "               → false
 *
 * This mirrors the boundary semantics of `termInText` in
 * cvDeterministicChecks.ts (single-word \b, phrase outer-edge boundaries)
 * without regex, and unlike a regex it cannot match inside a longer word.
 */
export function termInNormalized(normHaystack: string, normTerm: string): boolean {
  if (normTerm.length === 0) return false;
  return ` ${normHaystack} `.includes(` ${normTerm} `);
}

/** Convenience: normalise both sides, then match. */
export function termInText(rawHaystack: string, rawTerm: string): boolean {
  return termInNormalized(normalizeText(rawHaystack), normalizeText(rawTerm));
}

/**
 * Stopwords used only for *candidate n-gram generation* in the aggregator.
 * Deliberately excludes domain-bearing words ("guest", "linen", "safety",
 * "child") — those must survive into the term bank. Includes generic
 * job-ad filler ("required", "preferred", "ability", "experience") that would
 * otherwise dominate the frequency table without carrying CV signal.
 */
export const NGRAM_STOPWORDS: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'nor', 'so', 'yet', 'as', 'if', 'of',
  'to', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'onto', 'upon',
  'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
  'have', 'has', 'had', 'do', 'does', 'did', 'done',
  'will', 'would', 'shall', 'should', 'can', 'could', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'it', 'its', 'their', 'them', 'they',
  'we', 'you', 'your', 'our', 'us', 'his', 'her', 'him', 'she', 'he',
  'all', 'any', 'each', 'both', 'either', 'neither', 'some', 'such', 'other',
  'not', 'no', 'about', 'above', 'after', 'before', 'between', 'during',
  'through', 'under', 'while', 'within', 'without', 'including', 'include',
  'per', 'etc', 'eg', 'ie', 'e', 'g', 'i',
  'required', 'require', 'requires', 'preferred', 'prefer', 'preferably',
  'experience', 'experienced', 'years', 'year', 'month', 'months',
  'ability', 'able', 'skills', 'skill', 'work', 'working', 'works',
  'role', 'position', 'candidate', 'candidates', 'applicant', 'applicants',
  'company', 'companys', 'department', 'departmental', 'job', 'apply',
  'excellent', 'strong', 'good', 'great', 'well', 'proven', 'demonstrated',
  'must', 'please', 'also', 'well', 'high', 'level', 'new', 'use', 'used',
  'using', 'including', 'various', 'similar', 'related', 'relevant',
  'plus', 'advantage', 'advantageous', 'desirable', 'minimum', 'maximum',
  'you', 'your', 'yours', 'assist', 'assisting', 'assists', 'support',
  'ensure', 'ensuring', 'maintain', 'maintaining', 'provide', 'providing',
]);
