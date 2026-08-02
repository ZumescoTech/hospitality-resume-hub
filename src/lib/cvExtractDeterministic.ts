// cvExtractDeterministic.ts
// Regex-based field extraction for the hybrid CV extraction path (T5.2).
//
// Extracts high-confidence fields deterministically without an AI call:
//   - Email, phone number, LinkedIn URL
//   - Certification patterns (WSET, CMS / Court of Master Sommeliers, STCW, HACCP, CWA, ENG1)
//   - Date ranges (experience/education section headers)
//
// Hybrid strategy:
//   - ALWAYS fill personal contact fields from regex when found
//   - If a CV has HIGH confidence (email + phone + 2+ date ranges detected),
//     skip the AI extraction call (saves tokens)
//   - Otherwise, run AI extraction and overlay regex results on top
//     (regex-found email/phone override AI-extracted values — regex is more reliable)

export interface DeterministicExtract {
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  certifications: string[];  // e.g. ["WSET Level 2", "STCW Basic Safety Training"]
  dateRanges: string[];      // raw date range strings found in text
  /** True when confidence is high enough to skip AI extraction. */
  skipAi: boolean;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/;

// Matches international phone numbers: +27 71 234 5678 / 071 234 5678 / (071) 234-5678
const PHONE_RE =
  /(?:\+\d{1,3}[\s\-.]?)?\(?\d{1,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{3,4}(?:[\s\-.]?\d{3,4})?/;

const LINKEDIN_RE =
  /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?/i;

// Certification line patterns
const CERT_PATTERNS: Array<{ re: RegExp; canonical: string }> = [
  { re: /wset\s+(level\s+)?(\d|one|two|three|four|diploma)/i,     canonical: 'WSET' },
  { re: /wset\s+award/i,                                           canonical: 'WSET Award' },
  { re: /\bwset\b/i,                                               canonical: 'WSET' },
  { re: /court\s+of\s+master\s+sommeliers?/i,                      canonical: 'Court of Master Sommeliers' },
  { re: /(?:master|advanced|certified|introductory)\s+sommelier/i, canonical: 'Court of Master Sommeliers' },
  { re: /\bcms\b/i,                                                canonical: 'Court of Master Sommeliers' },
  { re: /stcw\s+basic\s+safety/i,                                  canonical: 'STCW Basic Safety Training' },
  { re: /\bstcw\b/i,                                               canonical: 'STCW' },
  { re: /haccp\s+(level\s+)?\d/i,                                  canonical: 'HACCP' },
  { re: /\bhaccp\b/i,                                              canonical: 'HACCP' },
  { re: /cape\s+wine\s+academy|cwa\s+certificate/i,                canonical: 'Cape Wine Academy' },
  { re: /eng1\s+medical|seafarer'?s?\s+medical/i,                  canonical: "ENG1 Medical" },
  { re: /\beng1\b/i,                                               canonical: 'ENG1' },
  { re: /discharge\s+book|seaman'?s?\s+discharge/i,               canonical: "Seaman's Discharge Book" },
  { re: /c1\s*\/?\s*d\s+(?:visa|us\s+visa)/i,                    canonical: 'C1/D US Visa' },
  { re: /hospitality\s+management\s+diploma|f&b\s+management\s+diploma/i, canonical: 'Hospitality Management Diploma' },
  { re: /food\s+safety\s+(level\s+)?\d/i,                         canonical: 'Food Safety Certificate' },
];

// Date range: "Jan 2019 – Mar 2022" / "2018 - Present" / "March 2020 – current"
const DATE_RANGE_RE =
  /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–\-—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–\-—to]+\s*(?:present|current|now)/gi;

// ─── Main extractor ───────────────────────────────────────────────────────────

export function extractFieldsDeterministically(cvText: string): DeterministicExtract {
  const email   = cvText.match(EMAIL_RE)?.[0] ?? null;
  const phone   = cvText.match(PHONE_RE)?.[0]?.trim() ?? null;
  const linkedIn = cvText.match(LINKEDIN_RE)?.[0] ?? null;

  // Certifications: scan every line, collect canonical labels for matching patterns
  const certSet = new Set<string>();
  const lines = cvText.split(/\r?\n/);
  for (const line of lines) {
    for (const { re, canonical } of CERT_PATTERNS) {
      if (re.test(line)) {
        certSet.add(canonical);
        break; // one canonical per line
      }
    }
  }
  const certifications = Array.from(certSet);

  const dateRanges = cvText.match(DATE_RANGE_RE) ?? [];

  // High-confidence heuristic: we have enough structure to skip AI extraction.
  // Criteria: email found AND (phone found OR LinkedIn found) AND ≥2 date ranges.
  const skipAi = Boolean(email) && Boolean(phone || linkedIn) && dateRanges.length >= 2;

  return { email, phone, linkedIn, certifications, dateRanges, skipAi };
}

/**
 * Overlay deterministic results onto an AI-extracted ResumeData.
 * Regex values are preferred for contact fields; AI values are kept for
 * everything else (structured experience, bullets, etc.).
 *
 * Called in both paths:
 *   - Hybrid (AI ran): overlay regex on AI result
 *   - Skip-AI: overlay regex on an empty skeleton
 */
export function overlayDeterministicExtract(
  base: import('@/types/resume').ResumeData,
  det: DeterministicExtract,
): import('@/types/resume').ResumeData {
  return {
    ...base,
    personal: {
      ...base.personal,
      email:  det.email  ?? base.personal.email  ?? '',
      phone:  det.phone  ?? base.personal.phone  ?? '',
      links: mergeLinks(base.personal.links ?? [], det.linkedIn),
    },
  };
}

function mergeLinks(
  existing: Array<{ label: string; url: string }>,
  linkedIn: string | null,
): Array<{ label: string; url: string }> {
  if (!linkedIn) return existing;
  const hasLinkedIn = existing.some((l) => /linkedin/i.test(l.url));
  if (hasLinkedIn) return existing;
  return [...existing, { label: 'LinkedIn', url: linkedIn }];
}
