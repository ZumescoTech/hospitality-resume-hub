import type { ResumeData } from "@/types/resume";
import type { CvScoreResult } from "@/lib/cruiseCvRubric";
import type {
  CheckerAudit,
  CheckerFix,
  CheckerFixKind,
  BuilderSectionId,
} from "@/types/checker-audit";

export type { CheckerAudit, CheckerFix, CheckerFixKind, BuilderSectionId };

const QUANTIFIED_RE =
  /\d+\s*(%|guests?|covers?|seats?|rooms?|staff|team\s+of|members?|increase|revenue|sales|£|\$|€|beds?)/i;

const CERT_HINTS = ["STCW", "WSET", "HACCP", "ENG1"] as const;

function shorten(text: string, max = 72): string {
  const first = text.split("—")[0]?.trim() || text.trim();
  return first.length > max ? `${first.slice(0, max - 1)}…` : first;
}

function classifyFeedback(text: string, index: number): CheckerFix {
  const id = `fix-${index}`;
  if (/email address and phone|contact information|add your email/i.test(text)) {
    return {
      id,
      title: "Add email and phone",
      explanation: text,
      priority: "high",
      targetSection: "personal",
      kind: "missing-contact",
    };
  }
  if (/professional summary|summary at the top/i.test(text)) {
    return {
      id,
      title: "Add a professional summary",
      explanation: text,
      priority: "high",
      targetSection: "personal",
      kind: "missing-summary",
    };
  }
  if (/numbers to your bullet|quantif/i.test(text)) {
    return {
      id,
      title: "Quantify your achievements",
      explanation: text,
      priority: "high",
      targetSection: "experience",
      kind: "missing-quantified",
    };
  }
  for (const cert of CERT_HINTS) {
    if (new RegExp(`\\b${cert}\\b`, "i").test(text)) {
      return {
        id,
        title: `Add ${cert} certification`,
        explanation: text,
        priority: "high",
        targetSection: "certifications",
        kind: "missing-cert",
        certName: cert,
      };
    }
  }
  if (/garbled|re-upload|docx/i.test(text)) {
    return {
      id,
      title: "Re-export a cleaner file",
      explanation: text,
      priority: "low",
      targetSection: "personal",
      kind: "generic",
    };
  }
  const keywordMatch = text.match(/Add "([^"]+)"/);
  const keyword = keywordMatch?.[1] ?? text.match(/Add ([A-Z][A-Za-z0-9 ./-]{1,40}?) to /)?.[1];
  return {
    id,
    title: shorten(text),
    explanation: text,
    priority: "medium",
    targetSection: "skills",
    kind: "missing-keyword",
    keyword: keyword?.trim(),
  };
}

function keywordFix(keyword: string, index: number): CheckerFix {
  const cert = CERT_HINTS.find(
    (c) => c.toLowerCase() === keyword.toLowerCase() || keyword.toUpperCase().includes(c),
  );
  if (cert) {
    return {
      id: `fix-kw-${index}`,
      title: `Add ${cert} certification`,
      explanation: `Add ${keyword} to your CV — it is listed as a key requirement for this role`,
      priority: "high",
      targetSection: "certifications",
      kind: "missing-cert",
      certName: cert,
      keyword,
    };
  }
  return {
    id: `fix-kw-${index}`,
    title: `Add ${keyword}`,
    explanation: `Add "${keyword}" to your CV — it is listed as a key requirement for this role`,
    priority: "medium",
    targetSection: "skills",
    kind: "missing-keyword",
    keyword,
  };
}

function alreadyCovers(fixes: CheckerFix[], next: CheckerFix): boolean {
  return fixes.some((f) => {
    if (f.kind === next.kind && f.kind !== "missing-keyword" && f.kind !== "missing-cert")
      return true;
    if (f.certName && next.certName && f.certName.toLowerCase() === next.certName.toLowerCase())
      return true;
    if (f.keyword && next.keyword && f.keyword.toLowerCase() === next.keyword.toLowerCase())
      return true;
    return false;
  });
}

export function buildCheckerAudit(result: CvScoreResult): CheckerAudit {
  const feedback = result.deterministicFeedback?.length
    ? result.deterministicFeedback
    : result.topFixes;
  const fixes: CheckerFix[] = [];
  feedback.forEach((text, i) => {
    if (fixes.length >= 5) return;
    const fix = classifyFeedback(text, i);
    if (!alreadyCovers(fixes, fix)) fixes.push(fix);
  });
  (result.missingKeywords ?? []).forEach((kw, i) => {
    if (fixes.length >= 5) return;
    const fix = keywordFix(kw, i);
    if (!alreadyCovers(fixes, fix)) fixes.push(fix);
  });
  return {
    overallScore: result.overallScore,
    tier: result.tier,
    confidence: result.confidence,
    categories: result.categories,
    topFixes: result.topFixes ?? [],
    missingKeywords: result.missingKeywords ?? [],
    matchedKeywords: result.matchedKeywords ?? [],
    deterministicFeedback: result.deterministicFeedback ?? [],
    fixes: fixes.slice(0, 5),
  };
}

function haystack(resume: ResumeData): string {
  const bits = [
    resume.summary,
    resume.personal.email,
    resume.personal.phone,
    ...resume.skills,
    ...resume.certifications.map((c) => `${c.name} ${c.issuer}`),
    ...resume.experience.flatMap((e) => [e.role, e.venue, e.description, ...(e.bullets ?? [])]),
  ];
  return bits.join("\n").toLowerCase();
}

export function evaluateFix(fix: CheckerFix, resume: ResumeData): boolean {
  switch (fix.kind) {
    case "missing-summary":
      return resume.summary.trim().length >= 40;
    case "missing-contact":
      return Boolean(resume.personal.email.trim() && resume.personal.phone.trim());
    case "missing-quantified":
      return resume.experience.some((e) => {
        const lines = [e.description, ...(e.bullets ?? [])];
        return lines.some((l) => QUANTIFIED_RE.test(l ?? ""));
      });
    case "missing-cert": {
      const needle = (fix.certName ?? fix.keyword ?? "").toLowerCase();
      if (!needle) return false;
      return haystack(resume).includes(needle.toLowerCase());
    }
    case "missing-keyword": {
      const needle = (fix.keyword ?? "").toLowerCase();
      if (!needle) return false;
      return haystack(resume).includes(needle);
    }
    case "generic":
      return Boolean(fix.completedManually);
    default:
      return Boolean(fix.completedManually);
  }
}

export function evaluateChecklist(
  audit: CheckerAudit,
  resume: ResumeData,
): { fixes: CheckerFix[]; completed: number; total: number } {
  const fixes = audit.fixes ?? [];
  const completed = fixes.filter((f) => evaluateFix(f, resume)).length;
  return { fixes, completed, total: fixes.length };
}
