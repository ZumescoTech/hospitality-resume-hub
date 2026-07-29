// build-precheck-termbanks.ts
// BUILD-TIME ONLY. Reads the scraped job-posting JSON for the two role types
// and emits src/data/precheck-termbanks.json — a committed, weighted term-bank
// asset the runtime pre-checker loads (never regenerated per request).
//
//   npx tsx scripts/build-precheck-termbanks.ts
//
// Pipeline per role:
//   1. weight postings (cruise 1.0, self-labelled non-cruise 0.4)
//   2. extract uni/bi/tri-gram candidates from duties+requirements+certs
//   3. STEM-MERGE surface variants (clean/cleaning/cleaned → one entry)
//   4. drop legal/eligibility boilerplate and filler via BLOCKLIST
//   5. weighted document frequency → coverage → core/common/differentiator
//   6. ANCHOR: overlay hand-curated domain terms (cabin: cruise-roles.json;
//      youth: curated list) so distinctive terms are guaranteed scored even
//      when this small corpus under-mentions them
//   7. classify certs (hard/soft) and parse experience minimums
//
// Deterministic: no timestamps, all arrays stably sorted → byte-identical
// output on identical inputs (reviewable in git).

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  normalizeText,
  tokenize,
  stemToken,
  stemPhrase,
  termInNormalized,
  NGRAM_STOPWORDS,
} from '../src/lib/precheck/normalize.ts';
import type {
  CertRequirement,
  CertTier,
  ExperienceProfile,
  PrecheckTermBanks,
  RoleTermBank,
  RoleType,
  TermTier,
  WeightedTerm,
} from '../src/lib/precheck/types.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

const TERM_BANK_VERSION = '1.1.0';
const OFF_TARGET_WEIGHT = 0.4; // non-cruise postings, per product decision
const CRUISE_WEIGHT = 1.0;
const CORE_THRESHOLD = 0.7; // coverage ≥ 0.70 → core
const COMMON_THRESHOLD = 0.3; // coverage 0.30–0.70 → common; below → differentiator
const OUTLIER_MONTHS = 120; // >10y stated minimum for an entry role = suspect
const MAX_DIFFERENTIATORS = 40; // cap the long tail so the asset stays reviewable

// Tier ordering for "take the strongest tier" when anchoring.
const TIER_RANK: Record<TermTier, number> = { differentiator: 0, common: 1, core: 2 };
function strongestTier(a: TermTier, b: TermTier): TermTier {
  return TIER_RANK[a] >= TIER_RANK[b] ? a : b;
}

// ─── Posting schema (tolerant: every field optional) ──────────────────────────

interface Posting {
  cruise_line_or_employer?: string;
  job_title_variant?: string;
  duties_raw?: string[];
  requirements_raw?: string[];
  required_certs?: string[];
  experience_years_required?: string;
}

interface CuratedAnchors {
  /** Guaranteed at least `core`. */
  primary: string[];
  /** Guaranteed at least `common`. */
  secondary: string[];
}

interface RoleConfig {
  key: RoleType;
  label: string;
  file: string;
  anchors: CuratedAnchors;
}

// ─── Curated domain anchors ───────────────────────────────────────────────────
// Cabin anchors are the hand-maintained keywords already in cruise-roles.json
// (role: cabin-steward-stewardess) — loaded below — plus a primary subset the
// product treats as must-haves. Youth has no matching role there, so its
// anchors are defined here from the domain cheat-sheet.

const cruiseRoles = JSON.parse(
  readFileSync(resolve(REPO_ROOT, 'src/data/cruise-roles.json'), 'utf8'),
) as { roles: { slug: string; keywords: string[] }[] };

const cabinCuratedKeywords =
  cruiseRoles.roles.find((r) => r.slug === 'cabin-steward-stewardess')?.keywords ?? [];

const CABIN_PRIMARY = [
  'turndown service', 'stateroom', 'housekeeping', 'cabin cleaning', 'bed making',
  'linen change', 'guest requests', '5-star standards', 'attention to detail',
  'physical stamina', 'STCW', 'guest amenities',
];

const YOUTH_PRIMARY = [
  'child safeguarding', 'age-appropriate activities', 'youth program', 'children',
  'arts and crafts', 'first aid', 'CPR', 'childcare', 'safety', 'supervision',
  'teens', 'games',
];
const YOUTH_SECONDARY = [
  'themed activities', 'special needs', 'recreation', 'camp', 'kids club',
  'registration', 'BLS', 'early childhood education', 'youth counselor',
  'age groups', 'child development', 'safeguarding policies', 'entertainment',
  'public speaking', 'multilingual', 'incident reports', 'sign-in sheets',
];

const ROLES: RoleConfig[] = [
  {
    key: 'cabin-steward',
    label: 'Cabin / Stateroom Steward',
    file: 'cabinsteward.json',
    anchors: {
      primary: CABIN_PRIMARY,
      // everything curated in cruise-roles.json that isn't already primary
      secondary: cabinCuratedKeywords.filter(
        (k) => !CABIN_PRIMARY.some((p) => stemPhrase(normalizeText(p)) === stemPhrase(normalizeText(k))),
      ),
    },
  },
  {
    key: 'staff-youth',
    label: 'Staff / Youth',
    file: 'staffyouth.json',
    anchors: { primary: YOUTH_PRIMARY, secondary: YOUTH_SECONDARY },
  },
];

// ─── Boilerplate / filler blocklist ───────────────────────────────────────────
// Stems dropped from the CORPUS candidate set (curated anchors are never
// blocked). Covers legal/eligibility boilerplate ("green card holder",
// "controlled substances", "28 weeks"), employer names, and contentless filler.
// A multi-word phrase is dropped if ANY of its word-stems is blocked.

const BLOCKED_STEMS: ReadonlySet<string> = new Set(
  [
    // legal / eligibility / HR boilerplate
    'citizen', 'citizenship', 'green', 'card', 'holder', 'controlled', 'substance',
    'alcohol', 'drug', 'marijuana', 'federal', 'transportation', 'prohibit',
    'strictly', 'consumption', 'tattoo', 'piercing', 'grooming', 'visa', 'passport',
    'eighteen', 'week', 'temporary', 'emergency', 'accommodation', 'meal', 'wage',
    'salary', 'bonus', 'closing', 'reference', 'eligibility', 'eligible', 'law',
    'accordance', 'according', 'equivalent', 'holder', 'motion', 'vessel', 'hatch',
    'ladder', 'diameter', 'shift', 'hour', 'expense', 'onsite', 'residential',
    // employer / place names
    'american', 'belmond', 'esalen', 'landsea', 'carnival', 'disney', 'princess',
    'cunard', 'norwegian', 'celebrity', 'msc', 'viking', 'holland', 'royal',
    'caribbean', 'squamish', 'britannic', 'uk', 'bc', 'ymca',
    // contentless filler
    'kindly', 'more', 'out', 'keep', 'thing', 'much', 'lot', 'willing',
    'comfortable', 'passionate', 'genuine', 'exciting', 'fun', 'energetic',
    'creative', 'responsible', 'friendly', 'honest', 'pleasant', 'outgoing',
    'welcome', 'welcoming', 'peace', 'mind', 'general', 'variety', 'wide',
    'range', 'part', 'member', 'day', 'daily', 'time', 'need', 'needed',
  ].map((w) => stemToken(w)),
);

function isBlocked(surface: string): boolean {
  return tokenize(stemPhrase(normalizeText(surface))).some((s) => BLOCKED_STEMS.has(s));
}

// ─── Off-target detection ─────────────────────────────────────────────────────

function isOffTarget(posting: Posting): boolean {
  return /\bnote\b/i.test(posting.cruise_line_or_employer ?? '');
}
function postingWeight(posting: Posting): number {
  return isOffTarget(posting) ? OFF_TARGET_WEIGHT : CRUISE_WEIGHT;
}

// ─── Candidate n-gram extraction ──────────────────────────────────────────────

function isContentToken(tok: string): boolean {
  return tok.length >= 3 && !NGRAM_STOPWORDS.has(tok) && !/^\d+$/.test(tok);
}

/** Candidate surface terms in one normalised string (unigrams/bigrams/trigrams). */
function candidatesFromNormalized(norm: string): Set<string> {
  const out = new Set<string>();
  const toks = tokenize(norm);
  for (let i = 0; i < toks.length; i++) {
    const a = toks[i];
    if (isContentToken(a)) out.add(a);
    const b = toks[i + 1];
    if (b !== undefined && isContentToken(a) && isContentToken(b)) out.add(`${a} ${b}`);
    const c = toks[i + 2];
    if (c !== undefined && isContentToken(a) && isContentToken(c) && b && b.length >= 2) {
      out.add(`${a} ${b} ${c}`); // middle may be a stopword: "attention to detail"
    }
  }
  return out;
}

/** Distinct candidate surfaces mentioned anywhere in one posting. */
function postingCandidates(posting: Posting): Set<string> {
  const fields = [
    ...(posting.duties_raw ?? []),
    ...(posting.requirements_raw ?? []),
    ...(posting.required_certs ?? []),
  ];
  const all = new Set<string>();
  for (const field of fields) {
    for (const cand of candidatesFromNormalized(normalizeText(field))) all.add(cand);
  }
  return all;
}

const DOMAIN_UNIGRAM_STEMS: ReadonlySet<string> = new Set(
  [
    'housekeeping', 'stateroom', 'cabin', 'linen', 'turndown', 'amenities',
    'minibar', 'toiletries', 'vacuuming', 'sanitation', 'disinfect',
    'cleanliness', 'laundry', 'inventory', 'bathrooms', 'balconies',
    'upholstered', 'embarkation', 'disembarkation',
    'children', 'teens', 'childcare', 'safeguarding', 'counselor', 'counsellor',
    'youth', 'toddlers', 'nursery', 'camp', 'activities', 'karaoke', 'trivia',
    'crafts', 'recreation', 'safety', 'guests', 'hospitality', 'multilingual',
    'onboard', 'shipboard', 'stamina', 'stcw', 'eng1', 'whmis', 'bls', 'cpr',
    'haccp', 'coshh', 'usph', 'wset', 'fidelio', 'marlins', 'pgce', 'safeguard',
  ].map((w) => stemToken(w)),
);

// ─── Stem-merged term aggregation (grouped record) ────────────────────────────

interface StemGroup {
  stem: string;
  /** surface form → number of postings that used exactly that surface */
  surfaces: Map<string, number>;
  docFreq: number; // distinct postings mentioning any surface in the group
  weighted: number; // Σ posting weight over those postings
}

function aggregateStemGroups(postings: Posting[]): Map<string, StemGroup> {
  const groups = new Map<string, StemGroup>();
  for (const posting of postings) {
    const w = postingWeight(posting);
    // A posting counts once per STEM even if it uses two surface variants.
    const stemsSeen = new Set<string>();
    for (const surface of postingCandidates(posting)) {
      if (isBlocked(surface)) continue;
      const stem = stemPhrase(normalizeText(surface));
      if (stem.length === 0) continue;
      let g = groups.get(stem);
      if (!g) {
        g = { stem, surfaces: new Map(), docFreq: 0, weighted: 0 };
        groups.set(stem, g);
      }
      g.surfaces.set(surface, (g.surfaces.get(surface) ?? 0) + 1);
      if (!stemsSeen.has(stem)) {
        stemsSeen.add(stem);
        g.docFreq += 1;
        g.weighted += w;
      }
    }
  }
  return groups;
}

/** Pick the human-readable surface for a stem group: most frequent, then shortest, then alpha. */
function canonicalSurface(g: StemGroup): string {
  return [...g.surfaces.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    if (a[0].length !== b[0].length) return a[0].length - b[0].length;
    return a[0].localeCompare(b[0]);
  })[0][0];
}

// ─── Build tiers: corpus terms + curated anchor overlay ───────────────────────

interface TermEntry extends WeightedTerm {
  tier: TermTier;
  isDomain: boolean;
}

function tierForCoverage(coverage: number): TermTier {
  if (coverage >= CORE_THRESHOLD) return 'core';
  if (coverage >= COMMON_THRESHOLD) return 'common';
  return 'differentiator';
}

function buildTiers(
  postings: Posting[],
  weightedTotal: number,
  anchors: CuratedAnchors,
): Record<TermTier, WeightedTerm[]> {
  const groups = aggregateStemGroups(postings);

  // stem → entry
  const entries = new Map<string, TermEntry>();
  for (const g of groups) {
    // keep single-posting terms only if domain-meaningful or a phrase
    const stem = g[0];
    const grp = g[1];
    const surface = canonicalSurface(grp);
    const isPhrase = surface.includes(' ');
    const isDomain = DOMAIN_UNIGRAM_STEMS.has(stem) || isPhrase;
    if (grp.docFreq < 2 && !isDomain) continue;
    const coverage = round3(grp.weighted / weightedTotal);
    entries.set(stem, {
      term: surface,
      coverage,
      docFreq: grp.docFreq,
      source: 'corpus',
      tier: tierForCoverage(coverage),
      isDomain,
    });
  }

  // Overlay curated anchors. For each, compute its true corpus coverage (may be
  // 0), then guarantee a floor tier. Merge onto an existing stem if present.
  const overlay = (surfaceList: string[], floor: TermTier) => {
    for (const surface of surfaceList) {
      const stem = stemPhrase(normalizeText(surface));
      if (stem.length === 0) continue;
      const { docFreq, weighted } = anchorCorpusStats(postings, stem);
      const coverage = round3(weighted / weightedTotal);
      const existing = entries.get(stem);
      if (existing) {
        existing.tier = strongestTier(existing.tier, floor);
        existing.source = 'both';
        existing.isDomain = true;
      } else {
        entries.set(stem, {
          term: surface.toLowerCase(),
          coverage,
          docFreq,
          source: docFreq > 0 ? 'both' : 'curated',
          tier: strongestTier(tierForCoverage(coverage), floor),
          isDomain: true,
        });
      }
    }
  };
  overlay(anchors.secondary, 'common');
  overlay(anchors.primary, 'core'); // primary last so it wins on overlap

  // Partition into tiers.
  const tiers: Record<TermTier, WeightedTerm[]> = { core: [], common: [], differentiator: [] };
  for (const e of entries.values()) {
    tiers[e.tier].push({ term: e.term, coverage: e.coverage, docFreq: e.docFreq, source: e.source });
  }

  for (const tier of Object.keys(tiers) as TermTier[]) {
    tiers[tier] = dedupeSubsumed(tiers[tier]);
    tiers[tier].sort(byRank);
  }
  // Distinctiveness-aware cap: domain terms & phrases already sort ahead of
  // generic single words, so slicing keeps the useful tail.
  tiers.differentiator = tiers.differentiator.slice(0, MAX_DIFFERENTIATORS);
  return tiers;
}

/** Weighted/raw doc-frequency of an already-stemmed term across postings. */
function anchorCorpusStats(postings: Posting[], stem: string): { docFreq: number; weighted: number } {
  let docFreq = 0;
  let weighted = 0;
  for (const posting of postings) {
    const hay = stemPhrase(
      normalizeText(
        [
          ...(posting.duties_raw ?? []),
          ...(posting.requirements_raw ?? []),
          ...(posting.required_certs ?? []),
        ].join(' . '),
      ),
    );
    if (termInNormalized(hay, stem)) {
      docFreq += 1;
      weighted += postingWeight(posting);
    }
  }
  return { docFreq, weighted };
}

/** Drop a longer phrase fully covered by a shorter kept term with equal stats. */
function dedupeSubsumed(terms: WeightedTerm[]): WeightedTerm[] {
  const stems = new Map(terms.map((t) => [stemPhrase(normalizeText(t.term)), t]));
  return terms.filter((t) => {
    const words = t.term.split(' ');
    if (words.length < 2) return true;
    return !words.some((w) => {
      const shorter = stems.get(stemToken(normalizeText(w)));
      return shorter && shorter !== t && shorter.coverage === t.coverage && shorter.docFreq === t.docFreq;
    });
  });
}

function isPhraseOrDomain(t: WeightedTerm): number {
  return t.term.includes(' ') || DOMAIN_UNIGRAM_STEMS.has(stemToken(normalizeText(t.term))) ? 1 : 0;
}
function byRank(a: WeightedTerm, b: WeightedTerm): number {
  // curated/both ahead of pure corpus, then distinctiveness, then coverage
  const srcRank = (t: WeightedTerm) => (t.source === 'corpus' ? 0 : 1);
  if (srcRank(b) !== srcRank(a)) return srcRank(b) - srcRank(a);
  if (isPhraseOrDomain(b) !== isPhraseOrDomain(a)) return isPhraseOrDomain(b) - isPhraseOrDomain(a);
  if (b.coverage !== a.coverage) return b.coverage - a.coverage;
  if (b.docFreq !== a.docFreq) return b.docFreq - a.docFreq;
  return a.term.localeCompare(b.term);
}

// ─── Certification aggregation ────────────────────────────────────────────────

interface CertRule {
  test: RegExp;
  name: string;
  tier: CertTier;
  aliases: string[];
}

const SOFT_MARKERS = /\b(preferred|advantage|advantageous|a plus|is a plus|desirable|optional|not required|nice to have)\b/i;

const CERT_RULES: CertRule[] = [
  { test: /stcw/i, name: 'STCW', tier: 'hard', aliases: ['stcw', 'basic safety training'] },
  { test: /\beng\s*1\b|eng1/i, name: 'ENG1', tier: 'hard', aliases: ['eng1', 'eng 1', 'seafarer medical', 'ships medical'] },
  { test: /whmis/i, name: 'WHMIS', tier: 'hard', aliases: ['whmis', 'workplace hazardous materials'] },
  { test: /\bbls\b|basic life support/i, name: 'BLS', tier: 'hard', aliases: ['bls', 'basic life support', 'medical first aid'] },
  { test: /child\s*safeguard/i, name: 'Child Safeguarding', tier: 'hard', aliases: ['child safeguarding', 'safeguarding'] },
  { test: /level\s*3|childcare diploma|pgce|teaching degree/i, name: 'Level 3 Childcare / Teaching Qualification', tier: 'hard', aliases: ['level 3', 'childcare diploma', 'pgce', 'teaching degree', 'nvq'] },
  { test: /supervise young children|certification to supervise/i, name: 'Childcare Supervision Certification', tier: 'hard', aliases: ['certification to supervise', 'childcare certification'] },
  { test: /wset/i, name: 'WSET', tier: 'hard', aliases: ['wset'] },
  { test: /haccp/i, name: 'HACCP', tier: 'hard', aliases: ['haccp', 'food safety'] },
  { test: /coshh/i, name: 'COSHH', tier: 'soft', aliases: ['coshh', 'chemical handling'] },
  { test: /cpr|first aid/i, name: 'CPR / First Aid', tier: 'soft', aliases: ['cpr', 'first aid'] },
  { test: /visa|c1\/?d|seaman/i, name: "Seaman's Visa (C1/D)", tier: 'soft', aliases: ['c1/d', 'seaman', 'visa'] },
  { test: /background check|criminal/i, name: 'Criminal Background Check', tier: 'soft', aliases: ['background check', 'criminal record'] },
  { test: /medical/i, name: 'Pre-employment Medical', tier: 'soft', aliases: ['medical'] },
  { test: /passport/i, name: 'Valid Passport', tier: 'soft', aliases: ['passport'] },
];

function classifyCert(raw: string): CertRule | null {
  for (const rule of CERT_RULES) {
    if (rule.test.test(raw)) {
      // A "hard" cert phrased as preferred/advisory ("CPR ... preferred") is
      // demoted to soft. Eligibility words inside a cert's own name ("Medical
      // First Aid") must NOT demote it — dedicated soft rules cover those.
      const demote = rule.tier === 'hard' && SOFT_MARKERS.test(raw);
      return demote ? { ...rule, tier: 'soft' } : rule;
    }
  }
  return null;
}

function aggregateCerts(postings: Posting[], weightedTotal: number): CertRequirement[] {
  const byName = new Map<string, { rule: CertRule; docFreq: number; cruiseDocFreq: number; weighted: number }>();
  for (const posting of postings) {
    const w = postingWeight(posting);
    const onCruise = !isOffTarget(posting);
    const seen = new Set<string>();
    for (const raw of posting.required_certs ?? []) {
      const rule = classifyCert(raw);
      if (!rule || seen.has(rule.name)) continue;
      seen.add(rule.name);
      const existing = byName.get(rule.name);
      if (existing) {
        existing.docFreq += 1;
        if (onCruise) existing.cruiseDocFreq += 1;
        existing.weighted += w;
        if (rule.tier === 'hard') existing.rule = { ...existing.rule, tier: 'hard' };
      } else {
        byName.set(rule.name, { rule, docFreq: 1, cruiseDocFreq: onCruise ? 1 : 0, weighted: w });
      }
    }
  }
  return [...byName.values()]
    .map(({ rule, docFreq, cruiseDocFreq, weighted }) => ({
      name: rule.name,
      tier: rule.tier,
      aliases: rule.aliases,
      docFreq,
      cruiseDocFreq,
      coverage: round3(weighted / weightedTotal),
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === 'hard' ? -1 : 1;
      if (b.coverage !== a.coverage) return b.coverage - a.coverage;
      return a.name.localeCompare(b.name);
    });
}

// ─── Experience parsing ───────────────────────────────────────────────────────

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
};

function parseMinMonths(raw: string): number | null {
  const text = raw.toLowerCase();
  const monthMatch = text.match(/(\d+)\s*(?:\+)?\s*months?/);
  if (monthMatch && !/year/.test(text)) return parseInt(monthMatch[1], 10);
  const digitYear = text.match(/(\d+)\s*(?:\+|\s*(?:-|to|–)\s*\d+)?\s*year/);
  if (digitYear) return parseInt(digitYear[1], 10) * 12;
  const wordYear = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b[^.]*year/);
  if (wordYear) return WORD_NUMBERS[wordYear[1]] * 12;
  const wordMonth = text.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twelve)\b[^.]*month/);
  if (wordMonth && !/year/.test(text)) return WORD_NUMBERS[wordMonth[1]];
  return null;
}

function buildExperienceProfile(postings: Posting[]): ExperienceProfile {
  const rawValues: string[] = [];
  const parsed: number[] = [];
  const suspectedOutliers: string[] = [];
  for (const posting of postings) {
    const raw = (posting.experience_years_required ?? '').trim();
    if (!raw) continue;
    rawValues.push(raw);
    const months = parseMinMonths(raw);
    if (months === null) continue;
    if (months > OUTLIER_MONTHS) {
      suspectedOutliers.push(raw);
      continue;
    }
    parsed.push(months);
  }
  parsed.sort((a, b) => a - b);
  return { statedMinimumsMonths: parsed, representativeMinMonths: median(parsed), rawValues, suspectedOutliers };
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}
function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
function readPostings(file: string): Posting[] {
  const data = JSON.parse(readFileSync(resolve(REPO_ROOT, file), 'utf8'));
  if (!Array.isArray(data)) throw new Error(`${file} is not a JSON array`);
  return data as Posting[];
}

// ─── main ─────────────────────────────────────────────────────────────────────

function buildRole(cfg: RoleConfig): RoleTermBank {
  const postings = readPostings(cfg.file);
  const weightedTotal = postings.reduce((sum, p) => sum + postingWeight(p), 0);
  const offTargetPostings = postings
    .filter(isOffTarget)
    .map((p) => ({ employer: p.cruise_line_or_employer ?? '(unknown)', weight: OFF_TARGET_WEIGHT }))
    .sort((a, b) => a.employer.localeCompare(b.employer));
  return {
    label: cfg.label,
    postingCount: postings.length,
    weightedTotal: round3(weightedTotal),
    offTargetPostings,
    tiers: buildTiers(postings, weightedTotal, cfg.anchors),
    certs: aggregateCerts(postings, weightedTotal),
    experience: buildExperienceProfile(postings),
  };
}

function main(): void {
  const roles = {} as Record<RoleType, RoleTermBank>;
  const sourceFiles = {} as Record<RoleType, string>;
  for (const cfg of ROLES) {
    roles[cfg.key] = buildRole(cfg);
    sourceFiles[cfg.key] = cfg.file;
  }
  const asset: PrecheckTermBanks = {
    version: TERM_BANK_VERSION,
    thresholds: { core: CORE_THRESHOLD, common: COMMON_THRESHOLD },
    offTargetWeight: OFF_TARGET_WEIGHT,
    sourceFiles,
    roles,
  };
  const outPath = resolve(REPO_ROOT, 'src/data/precheck-termbanks.json');
  writeFileSync(outPath, JSON.stringify(asset, null, 2) + '\n', 'utf8');

  for (const cfg of ROLES) {
    const r = roles[cfg.key];
    const fmt = (ts: WeightedTerm[]) => ts.map((t) => t.term).join(', ');
    console.log(
      `\n${r.label}: ${r.postingCount} postings (weightedTotal ${r.weightedTotal})` +
        `\n  CORE (${r.tiers.core.length}): ${fmt(r.tiers.core)}` +
        `\n  COMMON (${r.tiers.common.length}): ${fmt(r.tiers.common.slice(0, 20))}${r.tiers.common.length > 20 ? ' …' : ''}` +
        `\n  DIFFERENTIATOR (${r.tiers.differentiator.length}): ${fmt(r.tiers.differentiator.slice(0, 15))}${r.tiers.differentiator.length > 15 ? ' …' : ''}` +
        `\n  hard certs: ${r.certs.filter((c) => c.tier === 'hard').map((c) => c.name).join(', ') || '(none)'}` +
        `\n  experience median months: ${r.experience.representativeMinMonths}`,
    );
  }
  console.log(`\nWrote ${outPath}`);
}

main();
