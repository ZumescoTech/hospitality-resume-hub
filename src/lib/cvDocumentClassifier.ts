// cvDocumentClassifier.ts
// Deterministic "is this a CV?" gate. Runs before any score is computed or
// cached, so unrelated documents (invoices, cover letters, certificates…)
// never receive a CV score. Filename and the bare word "CV" are never used
// as evidence on their own.

export type CvDocumentVerdict = 'valid_cv' | 'uncertain' | 'not_a_cv';

export type NonCvKind =
  | 'cover_letter'
  | 'invoice'
  | 'bank_statement'
  | 'certificate'
  | 'assignment';

export interface CvDocumentClassification {
  verdict: CvDocumentVerdict;
  /** Points of CV evidence found (contact, sections, dates, roles, bullets). */
  cvEvidence: number;
  /** The strongest non-CV document type detected, if any. */
  detectedKind: NonCvKind | null;
  /** Human-readable explanation shown to the candidate. */
  reason: string;
}

/** Bump when classifier rules change, so evaluation results stay attributable. */
export const CLASSIFIER_VERSION = '1';

const CONTACT_RE = /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s\-().]{7,}\d/i;

// A heading is a short line whose text is (mostly) a conventional CV section name.
const SECTION_HEADINGS: { label: string; re: RegExp }[] = [
  { label: 'experience', re: /^(work|professional|employment|relevant|career)?\s*(experience|history|employment)( history)?$/i },
  { label: 'education', re: /^(education|education (and|&) training|training|qualifications|academic)( background)?$/i },
  { label: 'skills', re: /^((key|core|technical|professional)\s+)?(skills|competencies|strengths)( (and|&) (languages|competencies))?$/i },
  { label: 'profile', re: /^(personal |professional |career )?(profile|summary|objective|about me)$/i },
  { label: 'certifications', re: /^(certifications?|certificates|licen[cs]es|courses)( (and|&) (training|courses|licen[cs]es))?$/i },
  { label: 'languages', re: /^languages?$/i },
  { label: 'references', re: /^references?$/i },
  { label: 'personal', re: /^(personal (details|information)|contact( details| information)?)$/i },
  { label: 'achievements', re: /^(key )?(achievements|accomplishments|awards)$/i },
];

const MONTH = '(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?';
const DATE_TOKEN = `(?:${MONTH}\\s*\\d{4}|\\d{1,2}[/.]\\d{4}|\\d{4})`;
const DATE_RANGE_RE = new RegExp(
  `${DATE_TOKEN}\\s*(?:-|–|—|to|until)\\s*(?:${DATE_TOKEN}|present|current|now|date)`,
  'gi',
);

const ROLE_RE =
  /\b(waiter|waitress|server|bartender|barista|sommelier|steward(ess)?|housekeep(er|ing)|room attendant|receptionist|concierge|chef|cook|commis|kitchen|galley|cashier|host(ess)?|supervisor|manager|assistant|attendant|cleaner|porter|therapist|counsel+or|crew|intern|volunteer|sales|retail|cabin|front desk|food and beverage|f&b)\b/i;

const BULLET_LINE_RE = /^\s*([-•●▪◦*·]|\d+[.)])\s+\S/;

// Phrases that identify non-CV document types. Each kind needs several hits.
const NON_CV_SIGNALS: Record<NonCvKind, RegExp[]> = {
  cover_letter: [
    /^\s*dear\b/im,
    /\b(yours (sincerely|faithfully)|kind regards|best regards|warm regards|sincerely,)/i,
    /\bi am writing to\b/i,
    /\b(apply|application) for the (position|role|post)\b/i,
    /\b(enclosed|attached) (is |please find )?(my )?(cv|resume|résumé|curriculum vitae)\b/i,
    /\bthank you for (your time|considering)\b/i,
    /\b(look forward to|opportunity to discuss)\b/i,
  ],
  invoice: [
    /\binvoice\b/i,
    /\b(invoice|inv)\s*(no|number|#)/i,
    /\bbill(ed)? to\b/i,
    /\b(amount|balance|total) due\b/i,
    /\bsub-?total\b/i,
    /\b(vat|tax) (no|number|reg)/i,
    /\b(unit price|qty|quantity)\b/i,
    /\bpayment terms\b/i,
  ],
  bank_statement: [
    /\bstatement (period|date)\b/i,
    /\b(opening|closing|available) balance\b/i,
    /\baccount (number|no|holder)\b/i,
    /\b(debit|credit)s?\b.*\b(debit|credit)s?\b/i,
    /\btransaction (date|description|history)\b/i,
    /\b(branch code|sort code|iban|swift)\b/i,
  ],
  certificate: [
    /\bcertificate of\b/i,
    /\bthis is to certify\b/i,
    /\bhas (successfully )?(completed|attained|achieved|been awarded)\b/i,
    /\b(awarded|presented) to\b/i,
    /\bcertificate (no|number|id)\b/i,
    /\bdate of (issue|award)\b/i,
  ],
  assignment: [
    /\b(assignment|essay|coursework)\b/i,
    /\bstudent (no|number|id)\b/i,
    /\b(lecturer|module code|course code|due date)\b/i,
    /^\s*(introduction|conclusion|bibliography)\s*$/im,
    /\bword count\b/i,
    /\b(et al\.|\(\d{4}\))/i,
  ],
};

const NON_CV_THRESHOLD = 3;

const NON_CV_REASONS: Record<NonCvKind, string> = {
  cover_letter:
    'This looks like a cover letter rather than a CV. A cover letter cannot be scored as a CV.',
  invoice: 'This looks like an invoice or bill, not a CV.',
  bank_statement: 'This looks like a bank or account statement, not a CV.',
  certificate:
    'This looks like a certificate. Certificates support your CV, but they are not a CV on their own.',
  assignment: 'This looks like an assignment or essay, not a CV.',
};

function countSectionHeadings(lines: string[]): number {
  const found = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim().replace(/[:\-–—_|]+$/, '').trim();
    if (!line || line.length > 45) continue;
    for (const { label, re } of SECTION_HEADINGS) {
      if (re.test(line)) found.add(label);
    }
  }
  return found.size;
}

function detectNonCvKind(text: string): { kind: NonCvKind; hits: number } | null {
  let best: { kind: NonCvKind; hits: number } | null = null;
  for (const kind of Object.keys(NON_CV_SIGNALS) as NonCvKind[]) {
    const hits = NON_CV_SIGNALS[kind].filter((re) => re.test(text)).length;
    if (hits >= NON_CV_THRESHOLD && (!best || hits > best.hits)) best = { kind, hits };
  }
  return best;
}

export function measureCvEvidence(text: string): number {
  const lines = text.split(/\r?\n/);
  let points = 0;
  if (CONTACT_RE.test(text)) points += 2;
  points += Math.min(countSectionHeadings(lines), 4);
  const dateRanges = text.match(DATE_RANGE_RE)?.length ?? 0;
  if (dateRanges >= 1) points += 2;
  if (dateRanges >= 2) points += 1;
  if (ROLE_RE.test(text)) points += 1;
  if (lines.filter((l) => BULLET_LINE_RE.test(l)).length >= 3) points += 1;
  return points;
}

/** Evidence needed for a confident CV verdict. */
const VALID_THRESHOLD = 4;
/** Below this, there is too little CV structure to even ask. */
const UNCERTAIN_THRESHOLD = 2;
/** A document with non-CV markers needs this much CV evidence to be "uncertain" rather than rejected. */
const OVERRIDE_THRESHOLD = 7;

export function classifyCvDocument(text: string): CvDocumentClassification {
  const cvEvidence = measureCvEvidence(text);
  const nonCv = detectNonCvKind(text);

  if (nonCv) {
    // Strong CV structure plus non-CV markers (e.g. a CV with a cover letter
    // attached) — ask rather than reject outright.
    if (cvEvidence >= OVERRIDE_THRESHOLD) {
      return {
        verdict: 'uncertain',
        cvEvidence,
        detectedKind: nonCv.kind,
        reason:
          'This file has CV sections but also looks like another kind of document. If it contains your CV together with something else, upload the CV on its own for the most accurate check.',
      };
    }
    return { verdict: 'not_a_cv', cvEvidence, detectedKind: nonCv.kind, reason: NON_CV_REASONS[nonCv.kind] };
  }

  if (cvEvidence >= VALID_THRESHOLD) {
    return { verdict: 'valid_cv', cvEvidence, detectedKind: null, reason: '' };
  }
  if (cvEvidence >= UNCERTAIN_THRESHOLD) {
    return {
      verdict: 'uncertain',
      cvEvidence,
      detectedKind: null,
      reason:
        "We couldn't find the usual parts of a CV (contact details, work history with dates, education or skills), so we're not sure this is a CV.",
    };
  }
  return {
    verdict: 'not_a_cv',
    cvEvidence,
    detectedKind: null,
    reason:
      "This doesn't look like a CV — we found no contact details, work history, education or skills sections.",
  };
}
