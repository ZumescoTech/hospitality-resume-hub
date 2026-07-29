// types.ts
// Shape of the committed, build-time term-bank asset
// (src/data/precheck-termbanks.json) and the pre-checker's result. Kept
// separate from both the aggregator and the scorer so both depend on one
// contract.

export type RoleType = 'cabin-steward' | 'staff-youth';

export type TermTier = 'core' | 'common' | 'differentiator';

/** One aggregated term with its weighted coverage across the role's postings. */
export interface WeightedTerm {
  /** Human-readable surface form (lowercase). Matching is done on its stem. */
  term: string;
  /** weightedDocFreq / weightedTotal, rounded to 3dp. 0..1 (corpus-derived). */
  coverage: number;
  /** Number of postings (unweighted) that mention the term. */
  docFreq: number;
  /**
   * Where the term came from:
   *  - 'corpus'  : surfaced purely by frequency in the scraped postings
   *  - 'curated' : hand-picked domain anchor absent/rare in the corpus
   *  - 'both'    : curated AND corroborated by the corpus
   */
  source: 'corpus' | 'curated' | 'both';
}

export type CertTier = 'hard' | 'soft';

/**
 * An aggregated certification / eligibility requirement.
 * `hard` = unconditional real cert → the scorer surfaces it as a hard-gate
 * failure when absent. `soft` = "preferred"/"a plus" or an eligibility step
 * (visa, background check, medical, age) → advisory only, never a gate.
 */
export interface CertRequirement {
  /** Canonical short label, e.g. "STCW", "Child Safeguarding". */
  name: string;
  tier: CertTier;
  /** Strings to match against the CV (all matched case-/hyphen-insensitively). */
  aliases: string[];
  /** Number of postings (unweighted) that list this requirement. */
  docFreq: number;
  /**
   * Number of genuine CRUISE (non-off-target) postings that list it. The
   * scorer only hard-gates when this is ≥ 1 — so a cert seen only in an
   * off-target posting (e.g. WHMIS from a ski resort) is recorded but never
   * used to fail a CV.
   */
  cruiseDocFreq: number;
  /** Weighted coverage 0..1 across the role's postings. */
  coverage: number;
}

export interface ExperienceProfile {
  /** Parsed lower-bound minimums in months, one per posting that stated one. */
  statedMinimumsMonths: number[];
  /** Median of statedMinimumsMonths, robust to outliers. null if none stated. */
  representativeMinMonths: number | null;
  /** Raw free-text values, for auditing (includes the ones we couldn't parse). */
  rawValues: string[];
  /** Values parsed as > 120 months for an otherwise entry-level role. */
  suspectedOutliers: string[];
}

export interface RoleTermBank {
  label: string;
  postingCount: number;
  weightedTotal: number;
  /** Postings down-weighted to 0.4 because they are not cruise ships. */
  offTargetPostings: { employer: string; weight: number }[];
  tiers: Record<TermTier, WeightedTerm[]>;
  certs: CertRequirement[];
  experience: ExperienceProfile;
}

export interface PrecheckTermBanks {
  version: string;
  /** Coverage thresholds used to assign tiers. */
  thresholds: { core: number; common: number };
  /** Weight applied to non-cruise ("NOTE:"-flagged) postings. */
  offTargetWeight: number;
  sourceFiles: Record<RoleType, string>;
  roles: Record<RoleType, RoleTermBank>;
}

// ─── Scorer I/O ───────────────────────────────────────────────────────────────

export interface PrecheckResult {
  /** 0..100 keyword-coverage score. Hard-gate failures are NOT baked in here. */
  score: number;
  /** Human-readable hard requirements the CV appears to miss (surfaced separately). */
  hardGateFailures: string[];
  /** Terms from the bank found in the CV (core first). */
  matchedTerms: string[];
  /** Core terms the CV is missing — the highest-value fixes. */
  missingCoreTerms: string[];
}
