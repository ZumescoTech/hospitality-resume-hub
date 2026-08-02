// prechecker.ts
// Local, deterministic CV pre-checker. Runs BEFORE any AI/LLM call to gate and
// score a CV cheaply and explainably. Pure: no AI, no network, no I/O — safe to
// run on every request inside a Cloudflare Worker.
//
// The final numeric score is keyword-coverage only.
//
// Certification gating is NOT done here. Certs (STCW, ENG1, HACCP, …) never
// gate a term-bank role and never move the score — they are informational
// display fields only. The single certification gate that exists is
// role-conditional and lives in `certGate.ts` (Sommelier / Wine Waiter only,
// satisfied by WSET or CMS). Experience shortfalls are the only hard gate
// surfaced here, in `hardGateFailures`.

import { normalizeText, stemText, tokenize, termInNormalized } from './normalize';
import type {
  PrecheckResult,
  PrecheckTermBanks,
  RoleTermBank,
  RoleType,
  WeightedTerm,
} from './types';
// @ts-ignore — JSON import (build-time asset, see scripts/build-precheck-termbanks.ts)
import TERM_BANKS from '@/data/precheck-termbanks.json';
// @ts-ignore — JSON import: shared hospitality synonym groups (read-only here;
// this file is golden-tested via scoreKeywordAlignment — do NOT edit it).
import HOSPITALITY_SYNONYMS from '@/data/hospitality-synonyms.json';

const BANKS = TERM_BANKS as PrecheckTermBanks;

// Pre-check-local synonym supplement. Kept here (not in the shared
// hospitality-synonyms.json) so we can credit vocabulary variants specific to
// these two entry-level roles without touching the golden-tested keyword layer.
const PRECHECK_SYNONYMS: string[][] = [
  ['stateroom', 'staterooms', 'cabin', 'cabins', 'guest room', 'guest rooms', 'room', 'rooms', 'suite', 'suites', 'guest cabin'],
  ['turndown service', 'turndown', 'evening turndown', 'nightly turndown', 'turn-down service'],
  ['bed making', 'make beds', 'making beds', 'made beds', 'bed-making'],
  ['linen change', 'change linen', 'changing linens', 'change of linen', 'fresh linen', 'linen management', 'bed linen'],
  ['guest amenities', 'amenities', 'guest supplies', 'replenish amenities', 'toiletries'],
  ['attention to detail', 'detail oriented', 'detail-oriented', 'meticulous', 'eye for detail', 'thorough'],
  ['physical stamina', 'physically fit', 'physical fitness', 'stand for long periods', 'standing for extended periods', 'physically demanding'],
  ['5-star standards', '5-star', '5 star', 'five star', 'five-star', 'luxury standards', 'five-star standards'],
  ['age appropriate activities', 'age-appropriate activities', 'age appropriate programming', 'age-appropriate programming'],
  ['youth program', 'youth programme', 'kids program', "children's program", 'youth activities program'],
  ['arts and crafts', 'arts & crafts', 'crafts activities'],
  ['child safeguarding', 'safeguarding', 'child protection', 'child welfare'],
  ['supervision', 'supervise', 'supervised', 'supervising', 'oversee', 'overseeing'],
];

/**
 * stem → all OTHER member stems that should count as a match for it.
 * Built once at module load from both synonym sources.
 */
const SYNONYM_MAP: Map<string, Set<string>> = buildSynonymMap([
  ...(HOSPITALITY_SYNONYMS as string[][]),
  ...PRECHECK_SYNONYMS,
]);

function buildSynonymMap(groups: string[][]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const group of groups) {
    const stems = [...new Set(group.map((g) => stemText(g)).filter(Boolean))];
    for (const s of stems) {
      let set = map.get(s);
      if (!set) {
        set = new Set();
        map.set(s, set);
      }
      for (const other of stems) if (other !== s) set.add(other);
    }
  }
  return map;
}

// Score weighting: core dominates, common contributes, differentiators are a
// small bonus. Deliberately harsh — a CV that misses the core terms cannot
// float up on generic phrasing (the failure mode of the over-generous AI judge).
const CORE_WEIGHT = 0.7;
const COMMON_WEIGHT = 0.2;
const DIFF_WEIGHT = 0.1;
/** Matching this many differentiator terms earns full differentiator credit. */
const DIFF_FULL_CREDIT = 6;
/** Only flag an experience shortfall when the CV is short by at least this margin (years). */
const EXPERIENCE_SLACK_YEARS = 0.5;

export function availableRoles(): { role: RoleType; label: string }[] {
  return (Object.keys(BANKS.roles) as RoleType[]).map((role) => ({
    role,
    label: BANKS.roles[role].label,
  }));
}

export function isPrecheckRole(role: string): role is RoleType {
  return Object.prototype.hasOwnProperty.call(BANKS.roles, role);
}

/**
 * Score a CV against a role's term bank.
 * @param cvText  Plain extracted CV text (already parsed client-side).
 * @param role    'cabin-steward' | 'staff-youth'.
 * @param now     Injectable current year (defaults to real clock) so the
 *                experience gate is testable/deterministic.
 */
export function precheckCv(cvText: string, role: RoleType, now = new Date().getFullYear()): PrecheckResult {
  const bank = BANKS.roles[role];
  const stemmedCv = stemText(cvText);
  const cvTokens = tokenize(stemmedCv);
  const has = (term: string): boolean => matchTerm(stemmedCv, cvTokens, term);

  // ── Keyword coverage ──
  const matchedCore = bank.tiers.core.filter((t) => has(t.term));
  const missingCore = bank.tiers.core.filter((t) => !has(t.term));
  const matchedCommon = bank.tiers.common.filter((t) => has(t.term));
  const matchedDiff = bank.tiers.differentiator.filter((t) => has(t.term));

  const coreScore = ratio(matchedCore.length, bank.tiers.core.length);
  const commonScore = ratio(matchedCommon.length, bank.tiers.common.length);
  const diffScore = Math.min(matchedDiff.length / DIFF_FULL_CREDIT, 1);

  const score = Math.round(
    100 * (CORE_WEIGHT * coreScore + COMMON_WEIGHT * commonScore + DIFF_WEIGHT * diffScore),
  );

  // ── Hard gates (surfaced separately, never subtracted from `score`) ──
  // Certifications are NOT gated here — they are informational only (see the
  // module header and certGate.ts). Experience shortfall is the only hard gate.
  const hardGateFailures: string[] = [];

  const expFailure = experienceGate(cvText, bank, now);
  if (expFailure) hardGateFailures.push(expFailure);

  // Ordered core → common → differentiator; deduped by surface form.
  const matchedTerms = uniqueTerms([...matchedCore, ...matchedCommon, ...matchedDiff]);

  return {
    score,
    hardGateFailures,
    matchedTerms,
    missingCoreTerms: missingCore.map((t) => t.term),
  };
}

// ─── Matching ─────────────────────────────────────────────────────────────────

/**
 * True if `term` is present in the CV, trying in order:
 *   1. exact contiguous match on stems
 *   2. synonym match (any group member from either synonym source)
 *   3. bounded loose-phrase match — the phrase's words appear in order within a
 *      window of (wordCount + 2) tokens, so "5-star luxury standard" credits
 *      "5-star standards" without matching words scattered across the CV.
 */
function matchTerm(stemmedCv: string, cvTokens: string[], term: string): boolean {
  const stem = stemText(term);
  if (stem.length === 0) return false;
  if (termInNormalized(stemmedCv, stem)) return true;

  const synonyms = SYNONYM_MAP.get(stem);
  if (synonyms) {
    for (const syn of synonyms) if (termInNormalized(stemmedCv, syn)) return true;
  }

  return loosePhraseMatch(cvTokens, stem.split(' '));
}

/** Ordered-subsequence match of `words` within any window of `words.length + 2` CV tokens. */
function loosePhraseMatch(cvTokens: string[], words: string[]): boolean {
  if (words.length < 2) return false; // single words must match exactly/synonym
  const win = words.length + 2;
  for (let i = 0; i + words.length <= cvTokens.length; i++) {
    let wi = 0;
    for (let j = i; j < Math.min(i + win, cvTokens.length) && wi < words.length; j++) {
      if (cvTokens[j] === words[wi]) wi++;
    }
    if (wi === words.length) return true;
  }
  return false;
}

// ─── Hard gates ───────────────────────────────────────────────────────────────

/**
 * Flag an experience shortfall only when we can estimate the CV's experience AND
 * it is clearly below the role's representative minimum. Silence (null estimate)
 * is never a failure — we don't punish a CV we can't read a timeline from.
 */
function experienceGate(cvText: string, bank: RoleTermBank, now: number): string | null {
  const repMonths = bank.experience.representativeMinMonths;
  if (repMonths == null) return null;
  const requiredYears = repMonths / 12;

  const cvYears = estimateCvExperienceYears(cvText, now);
  if (cvYears == null) return null;
  if (cvYears + EXPERIENCE_SLACK_YEARS >= requiredYears) return null;

  return (
    `Experience looks light — postings for this role typically expect about ${fmtYears(requiredYears)}, ` +
    `but your CV suggests roughly ${fmtYears(cvYears)}. Make relevant experience more prominent, or add duration/dates.`
  );
}

/**
 * Best-effort estimate of years of experience shown in a CV, taking the larger
 * of: (a) the biggest explicit "N years" phrase, and (b) the span from the
 * earliest 4-digit year to the latest (or to `now` if the CV says "present").
 * Intentionally an over-estimate — the gate only fires on a clear shortfall.
 */
export function estimateCvExperienceYears(cvText: string, now = new Date().getFullYear()): number | null {
  let best: number | null = null;

  for (const m of cvText.matchAll(/(\d{1,2})\s*\+?\s*years?\b/gi)) {
    const n = parseInt(m[1], 10);
    if (n <= 50) best = Math.max(best ?? 0, n);
  }

  const years = [...cvText.matchAll(/\b(?:19|20)\d{2}\b/g)]
    .map((m) => parseInt(m[0], 10))
    .filter((y) => y >= 1970 && y <= now);
  if (years.length > 0) {
    const earliest = Math.min(...years);
    const latest = /\b(present|current|now|ongoing)\b/i.test(cvText) ? now : Math.max(...years);
    const span = latest - earliest;
    if (span > 0) best = Math.max(best ?? 0, span);
  }

  return best;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function ratio(n: number, d: number): number {
  return d > 0 ? n / d : 0;
}

function uniqueTerms(terms: WeightedTerm[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of terms) {
    const key = normalizeText(t.term);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t.term);
  }
  return out;
}

function fmtYears(y: number): string {
  const rounded = Math.round(y * 2) / 2; // nearest half-year
  const label = Number.isInteger(rounded) ? `${rounded}` : `${rounded}`;
  return `${label} year${rounded === 1 ? '' : 's'}`;
}
