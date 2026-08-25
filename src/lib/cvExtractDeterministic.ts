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

import {
  emptyResume,
  type ResumeData,
  type Experience,
  type Education,
  type Certification,
  type Hospitality,
} from "@/types/resume";
import { uid } from "@/lib/utils";

export interface DeterministicExtract {
  email: string | null;
  phone: string | null;
  linkedIn: string | null;
  certifications: string[]; // e.g. ["WSET Level 2", "STCW Basic Safety Training"]
  dateRanges: string[]; // raw date range strings found in text
  /** True when confidence is high enough to skip AI extraction. */
  skipAi: boolean;
}

// ─── Patterns ─────────────────────────────────────────────────────────────────

const EMAIL_RE = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// Matches international phone numbers: +27 71 234 5678 / 071 234 5678 / (071) 234-5678
const PHONE_RE =
  /(?:\+\d{1,3}[\s\-.]?)?\(?\d{1,4}\)?[\s\-.]?\d{2,4}[\s\-.]?\d{3,4}(?:[\s\-.]?\d{3,4})?/;

const LINKEDIN_RE = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?/i;

// Certification line patterns
const CERT_PATTERNS: Array<{ re: RegExp; canonical: string }> = [
  { re: /wset\s+(level\s+)?(\d|one|two|three|four|diploma)/i, canonical: "WSET" },
  { re: /wset\s+award/i, canonical: "WSET Award" },
  { re: /\bwset\b/i, canonical: "WSET" },
  { re: /court\s+of\s+master\s+sommeliers?/i, canonical: "Court of Master Sommeliers" },
  {
    re: /(?:master|advanced|certified|introductory)\s+sommelier/i,
    canonical: "Court of Master Sommeliers",
  },
  { re: /\bcms\b/i, canonical: "Court of Master Sommeliers" },
  { re: /stcw\s+basic\s+safety/i, canonical: "STCW Basic Safety Training" },
  { re: /\bstcw\b/i, canonical: "STCW" },
  { re: /haccp\s+(level\s+)?\d/i, canonical: "HACCP" },
  { re: /\bhaccp\b/i, canonical: "HACCP" },
  { re: /cape\s+wine\s+academy|cwa\s+certificate/i, canonical: "Cape Wine Academy" },
  { re: /eng1\s+medical|seafarer'?s?\s+medical/i, canonical: "ENG1 Medical" },
  { re: /\beng1\b/i, canonical: "ENG1" },
  { re: /discharge\s+book|seaman'?s?\s+discharge/i, canonical: "Seaman's Discharge Book" },
  { re: /c1\s*\/?\s*d\s+(?:visa|us\s+visa)/i, canonical: "C1/D US Visa" },
  {
    re: /hospitality\s+management\s+diploma|f&b\s+management\s+diploma/i,
    canonical: "Hospitality Management Diploma",
  },
  { re: /food\s+safety\s+(level\s+)?\d/i, canonical: "Food Safety Certificate" },
];

// Date range: "Jan 2019 – Mar 2022" / "2018 - Present" / "March 2020 – current"
const DATE_RANGE_RE =
  /(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–\-—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}|(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–\-—to]+\s*(?:present|current|now)/gi;

// ─── Main extractor ───────────────────────────────────────────────────────────

export function extractFieldsDeterministically(cvText: string): DeterministicExtract {
  const email = cvText.match(EMAIL_RE)?.[0] ?? null;
  const phone = cvText.match(PHONE_RE)?.[0]?.trim() ?? null;
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
  base: import("@/types/resume").ResumeData,
  det: DeterministicExtract,
): import("@/types/resume").ResumeData {
  return {
    ...base,
    personal: {
      ...base.personal,
      email: det.email ?? base.personal.email ?? "",
      phone: det.phone ?? base.personal.phone ?? "",
      links: mergeLinks(base.personal.links ?? [], det.linkedIn),
    },
  };
}

type SectionId = "header" | "summary" | "experience" | "education" | "skills" | "certs";

const SECTION_HEADINGS: Array<{ id: Exclude<SectionId, "header">; re: RegExp }> = [
  { id: "summary", re: /^(professional\s+)?(summary|profile|objective|about\s+me)\b/i },
  {
    id: "experience",
    re: /^(work(\s+experience)?|employment(\s+history)?|experience|work\s+history)\s*$/i,
  },
  { id: "education", re: /^(education|academic(\s+background)?)\s*$/i },
  { id: "skills", re: /^(skills|key\s+skills|core\s+competenc\w*|technical\s+skills)\s*$/i },
  {
    id: "certs",
    re: /^(qualifications?(\s*(&|and)\s*certifications?)?|certifications?|licen[cs]es?|training)\s*$/i,
  },
];

const MONTHS: Record<string, string> = {
  jan: "01",
  feb: "02",
  mar: "03",
  apr: "04",
  may: "05",
  jun: "06",
  jul: "07",
  aug: "08",
  sep: "09",
  oct: "10",
  nov: "11",
  dec: "12",
};

const DATE_RANGE_TAIL =
  /((?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?\d{4}\s*[–\-—to]+\s*(?:(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+)?(?:\d{4}|present|current|now))\s*$/i;

const JOB_DASH = /\s+[—–−-]\s+/;

function detectSection(line: string): Exclude<SectionId, "header"> | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return null;
  for (const { id, re } of SECTION_HEADINGS) {
    if (re.test(trimmed)) return id;
  }
  return null;
}

function splitSections(cvText: string): Record<SectionId, string[]> {
  const buckets: Record<SectionId, string[]> = {
    header: [],
    summary: [],
    experience: [],
    education: [],
    skills: [],
    certs: [],
  };
  let current: SectionId = "header";
  for (const raw of cvText.split(/\r?\n/)) {
    const section = detectSection(raw);
    if (section) {
      current = section;
      continue;
    }
    buckets[current].push(raw);
  }
  return buckets;
}

function parseDateToken(token: string): string {
  const t = token.trim();
  if (/^(present|current|now)$/i.test(t)) return "";
  const m = t.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{4})/i);
  if (m) return `${m[2]}-${MONTHS[m[1].toLowerCase().slice(0, 3)]}`;
  const y = t.match(/(\d{4})/);
  return y ? y[1] : "";
}

function parseDateRange(raw: string): { startDate: string; endDate: string; current: boolean } {
  const parts = raw.split(/\s*[–\-—to]+\s*/i);
  const startDate = parseDateToken(parts[0] ?? "");
  const endRaw = parts[1] ?? "";
  const current = /present|current|now/i.test(endRaw);
  return { startDate, endDate: current ? "" : parseDateToken(endRaw), current };
}

function splitVenueLocation(rest: string): { venue: string; location: string } {
  const trimmed = rest.trim().replace(/\s{2,}/g, " ");
  const lastComma = trimmed.lastIndexOf(",");
  if (lastComma <= 0) return { venue: trimmed, location: "" };
  const venue = trimmed.slice(0, lastComma).trim();
  const location = trimmed.slice(lastComma + 1).trim();
  if (!venue || location.length > 60) return { venue: trimmed, location: "" };
  return { venue, location };
}

function isBullet(line: string): boolean {
  return /^\s*[-•*·–]\s+/.test(line);
}

function stripBullet(line: string): string {
  return line.replace(/^\s*[-•*·–]\s+/, "").trim();
}

function looksLikeJobHeader(line: string): boolean {
  if (isBullet(line)) return false;
  if (!DATE_RANGE_TAIL.test(line) && !JOB_DASH.test(line)) return false;
  return line.trim().length > 6 && line.trim().length < 180;
}

function parseJobHeader(line: string): Omit<Experience, "id" | "description" | "bullets"> | null {
  const trimmed = line.trim();
  const dateMatch = trimmed.match(DATE_RANGE_TAIL);
  let body = trimmed;
  let dates = { startDate: "", endDate: "", current: false };
  if (dateMatch) {
    dates = parseDateRange(dateMatch[1]);
    body = trimmed.slice(0, dateMatch.index).trim();
  }
  const dash = body.search(JOB_DASH);
  if (dash < 0) {
    if (!dateMatch) return null;
    return { role: body, venue: "", location: "", ...dates };
  }
  const role = body.slice(0, dash).trim();
  const rest = body.slice(dash).replace(JOB_DASH, "").trim();
  const { venue, location } = splitVenueLocation(rest);
  if (!role) return null;
  return { role, venue, location, ...dates };
}

function parseExperience(lines: string[]): Experience[] {
  const jobs: Experience[] = [];
  let current: Experience | null = null;

  const flush = () => {
    if (!current) return;
    if (current.role.trim() || current.venue.trim() || (current.bullets?.length ?? 0) > 0) {
      jobs.push(current);
    }
    current = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();
    if (!trimmed) continue;

    const header = looksLikeJobHeader(trimmed) ? parseJobHeader(trimmed) : null;
    if (header && header.role) {
      flush();
      current = { id: uid(), description: "", bullets: [], ...header };
      continue;
    }

    if (isBullet(trimmed)) {
      if (!current)
        current = {
          id: uid(),
          role: "",
          venue: "",
          location: "",
          startDate: "",
          endDate: "",
          description: "",
          bullets: [],
        };
      current.bullets = [...(current.bullets ?? []), stripBullet(trimmed)];
      continue;
    }

    if (!current) {
      current = {
        id: uid(),
        role: trimmed,
        venue: "",
        location: "",
        startDate: "",
        endDate: "",
        description: "",
        bullets: [],
      };
      continue;
    }
    if (!current.venue && trimmed.length < 80 && !/[.]{2,}/.test(trimmed)) {
      current.venue = trimmed;
      continue;
    }
    current.bullets = [...(current.bullets ?? []), trimmed];
  }
  flush();
  return jobs.filter((j) => j.role.trim());
}

function parseEducation(lines: string[]): Education[] {
  const out: Education[] = [];
  for (const raw of lines) {
    const trimmed = stripBullet(raw);
    if (!trimmed) continue;
    if (trimmed.length < 8) continue;
    const yearMatch = trimmed.match(/,?\s*(\d{4})\s*$/);
    const endDate = yearMatch?.[1] ?? "";
    const body = yearMatch ? trimmed.slice(0, yearMatch.index).replace(/[,\s]+$/, "") : trimmed;
    const dash = body.search(JOB_DASH);
    if (dash >= 0) {
      const degree = body.slice(0, dash).trim();
      const schoolRaw = body.slice(dash).replace(JOB_DASH, "").trim();
      const { venue: school, location: field } = splitVenueLocation(schoolRaw);
      out.push({
        id: uid(),
        school: school || schoolRaw,
        degree,
        field: field || undefined,
        startDate: "",
        endDate,
        description: "",
      });
    } else if (
      endDate ||
      /college|school|university|lyc[eé]e|diploma|certificate|baccal/i.test(body)
    ) {
      out.push({ id: uid(), school: body, degree: body, startDate: "", endDate, description: "" });
    }
  }
  return out;
}

function parseSkills(lines: string[]): string[] {
  const items: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/\s*[|,•·]\s*/);
    for (const part of parts) {
      const skill = part.replace(/^[-–]\s*/, "").trim();
      if (skill.length < 2 || skill.length > 60) continue;
      items.push(skill);
    }
  }
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const skill of items) {
    const key = skill.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(skill);
  }
  return unique;
}

function parseCertLine(line: string): Certification | null {
  const trimmed = stripBullet(line);
  if (!trimmed || trimmed.length < 3) return null;
  let expiry: string | undefined;
  let year = "";
  let issuer = "";
  let name = trimmed;

  const expiryMatch = trimmed.match(
    /\b(?:valid to|expires?|expiry)\s*(?:to\s*)?(\d{4}(?:-\d{2})?)/i,
  );
  if (expiryMatch) {
    expiry = expiryMatch[1];
    name = name.replace(expiryMatch[0], "").trim();
  }
  const issuedMatch = trimmed.match(/\bissued\s+(\d{4})/i);
  if (issuedMatch) year = issuedMatch[1];
  const yearTail = name.match(/,?\s*(\d{4})\s*$/);
  if (!year && yearTail) {
    year = yearTail[1];
    name = name.slice(0, yearTail.index).replace(/[,\s]+$/, "");
  }

  const dash = name.search(JOB_DASH);
  if (dash >= 0) {
    const right = name.slice(dash).replace(JOB_DASH, "").trim();
    if (!/^(valid|expires?|issued)/i.test(right)) {
      issuer = right
        .replace(/\bissued\s+\d{4}/i, "")
        .replace(/\bexpires?\s+\d{4}/i, "")
        .replace(/^[,\s]+|[,\s]+$/g, "");
      name = name.slice(0, dash).trim();
    }
  }
  const paren = name.match(/\(([^)]+)\)\s*$/);
  if (paren && !issuer) {
    issuer = paren[1];
  }
  name = name.replace(/[—–−,;:\s]+$/g, "").trim();
  if (!name) return null;
  return { id: uid(), name, issuer, year, expiry };
}

function parseCertifications(lines: string[], det: DeterministicExtract): Certification[] {
  const certs: Certification[] = [];
  for (const line of lines) {
    if (!line.trim()) continue;
    const parsed = parseCertLine(line);
    if (parsed) certs.push(parsed);
  }

  const hasHint = (hint: string) =>
    certs.some((c) => c.name.toLowerCase().includes(hint.toLowerCase()));

  for (const canonical of det.certifications) {
    const hint = canonical.split(/\s+/)[0];
    if (hasHint(hint) || hasHint(canonical)) continue;
    certs.push({ id: uid(), name: canonical, issuer: "", year: "" });
  }
  return certs;
}

function extractLocationFromHeader(lines: string[]): string {
  for (const raw of lines) {
    const parts = raw
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean);
    for (const part of parts) {
      if (EMAIL_RE.test(part) || PHONE_RE.test(part) || LINKEDIN_RE.test(part)) continue;
      if (/linkedin/i.test(part)) continue;
      if (/[A-Za-z].*,\s*[A-Za-z]/.test(part) && part.length < 80) return part;
    }
  }
  return "";
}

function extractName(lines: string[]): string {
  return (
    lines
      .map((l) => l.trim())
      .find(
        (l) =>
          l.length > 0 && l.length < 60 && /^[A-Za-z\s\-']+$/.test(l) && l.split(/\s+/).length >= 2,
      ) ?? ""
  );
}

function parseSummary(lines: string[]): string {
  return lines
    .map((l) => l.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

const POS_TERMS: Array<{ re: RegExp; label: string }> = [
  { re: /\bmicros(?:\s+(?:pos|simphony))?\b|\bsimphony\b/i, label: "Micros" },
  { re: /\blightspeed\b/i, label: "Lightspeed" },
  { re: /\btoast\b/i, label: "Toast" },
  { re: /\bsquare\b/i, label: "Square" },
  { re: /\baloha\b/i, label: "Aloha" },
  { re: /\btouchbistro\b/i, label: "TouchBistro" },
  { re: /\beazywine\b/i, label: "Eazywine" },
  { re: /\bopera\s+pms\b/i, label: "Opera PMS" },
];

const SERVICE_STYLES: Array<{ re: RegExp; label: string }> = [
  { re: /fine[\s-]?dining/i, label: "Fine dining" },
  { re: /silver service/i, label: "Silver service" },
  { re: /\bbanquet/i, label: "Banquet" },
  { re: /\bbuffet/i, label: "Buffet" },
  { re: /cocktail bar/i, label: "Cocktail bar" },
  { re: /à la carte|a la carte/i, label: "À la carte" },
  { re: /\bbistro\b/i, label: "Bistro" },
];

const LANG_NAMES =
  "English|French|Spanish|Portuguese|Italian|German|Dutch|Mandarin|Chinese|Japanese|Arabic|Swahili|Zulu|Xhosa|Afrikaans|Hindi|Tagalog|Russian|Korean|Turkish|Polish|Greek|Romanian";

function parseLangLevel(raw: string): Hospitality["languages"][number]["level"] {
  const s = raw.toLowerCase();
  if (/\bnative\b/.test(s)) return "Native";
  if (/\bfluent\b/.test(s)) return "Fluent";
  if (/\bbasic\b/.test(s)) return "Basic";
  if (/\b(conversational|spoken|good)\b/.test(s)) return "Conversational";
  return "Fluent";
}

const LANG_RANK: Record<Hospitality["languages"][number]["level"], number> = {
  Basic: 1,
  Conversational: 2,
  Fluent: 3,
  Native: 4,
};

function parseLanguages(cvText: string): Hospitality["languages"] {
  const byName = new Map<string, Hospitality["languages"][number]>();
  const re = new RegExp(
    `\\b(${LANG_NAMES})\\b(?:\\s*\\(([^)]+)\\)|\\s*:\\s*([A-Za-z]+))?`,
    "gi",
  );
  for (const match of cvText.matchAll(re)) {
    const name = match[1][0].toUpperCase() + match[1].slice(1).toLowerCase();
    const key = name.toLowerCase();
    const levelRaw = (match[2] ?? match[3] ?? "").trim();
    const level = levelRaw ? parseLangLevel(levelRaw) : "Fluent";
    const prev = byName.get(key);
    if (!prev || LANG_RANK[level] > LANG_RANK[prev.level]) {
      byName.set(key, { name, level });
    }
  }
  return Array.from(byName.values());
}

function wineKnowledgeFrom(cvText: string): Hospitality["wineKnowledge"] {
  if (
    /\bsommelier\b/i.test(cvText) ||
    /court\s+of\s+master\s+sommeliers?|\bcms\b/i.test(cvText) ||
    /wset\s+(level\s+)?(3|4|three|four|diploma)/i.test(cvText)
  ) {
    return "Sommelier";
  }
  if (/wset\s+(level\s+)?(2|two)/i.test(cvText)) return "Advanced";
  if (/wset\b/i.test(cvText) || /wine\s+(service|pairing|list|knowledge)/i.test(cvText)) {
    return "Intermediate";
  }
  if (/\bwine\b/i.test(cvText)) return "Beginner";
  return "None";
}

function spiritsKnowledgeFrom(cvText: string): Hospitality["spiritsKnowledge"] {
  if (/\bmixologist\b/i.test(cvText)) return "Mixologist";
  if (/\bcocktail/i.test(cvText) || /\bbartend/i.test(cvText) || /\bspirits?\b/i.test(cvText)) {
    return "Intermediate";
  }
  return "None";
}

function parseHospitality(cvText: string): Hospitality {
  const posSystems: string[] = [];
  for (const { re, label } of POS_TERMS) {
    if (re.test(cvText) && !posSystems.includes(label)) posSystems.push(label);
  }
  const serviceStyles: string[] = [];
  for (const { re, label } of SERVICE_STYLES) {
    if (re.test(cvText) && !serviceStyles.includes(label)) serviceStyles.push(label);
  }
  const languages = parseLanguages(cvText);
  let foodSafety = "";
  if (/\bhaccp\b/i.test(cvText)) foodSafety = "HACCP";
  else if (/\bservsafe\b/i.test(cvText)) foodSafety = "ServSafe";
  else if (/food\s+(safety|hygiene)/i.test(cvText)) foodSafety = "Food safety";

  return {
    serviceStyles,
    posSystems,
    wineKnowledge: wineKnowledgeFrom(cvText),
    spiritsKnowledge: spiritsKnowledgeFrom(cvText),
    languages: languages.length > 0 ? languages : emptyResume.hospitality.languages,
    allergens: /\ballergen/i.test(cvText),
    foodSafety,
  };
}

/**
 * Zero-AI structured parse for the public checker handoff (and hybrid skip-AI).
 * Extracts sections that are confidently present. Never fabricates missing jobs or certs.
 */
export function parseCvLocally(cvText: string): ResumeData {
  try {
    const det = extractFieldsDeterministically(cvText);
    const sections = splitSections(cvText);
    const experience = parseExperience(sections.experience);
    const education = parseEducation(sections.education);
    const skills = parseSkills(sections.skills);
    const certifications = parseCertifications(sections.certs, det);
    const summary = parseSummary(sections.summary);
    const fullName = extractName(sections.header) || extractName(cvText.split(/\r?\n/));
    const location = extractLocationFromHeader(sections.header);

    const skeleton: ResumeData = {
      ...emptyResume,
      personal: {
        ...emptyResume.personal,
        fullName,
        title: experience[0]?.role ?? "",
        location,
        links: [],
      },
      summary,
      experience,
      education,
      skills,
      certifications,
      hospitality: parseHospitality(cvText),
      templateId: "vintage",
    };

    return overlayDeterministicExtract(skeleton, det);
  } catch {
    const det = extractFieldsDeterministically(cvText);
    const fallback: ResumeData = {
      ...emptyResume,
      personal: { ...emptyResume.personal, links: [] },
      templateId: "vintage",
    };
    return overlayDeterministicExtract(fallback, det);
  }
}

function mergeLinks(
  existing: Array<{ label: string; url: string }>,
  linkedIn: string | null,
): Array<{ label: string; url: string }> {
  if (!linkedIn) return existing;
  const hasLinkedIn = existing.some((l) => /linkedin/i.test(l.url));
  if (hasLinkedIn) return existing;
  return [...existing, { label: "LinkedIn", url: linkedIn }];
}
