import type { CvScoreResult } from "@/lib/cruiseCvRubric";
import type { ConfidenceResult } from "@/lib/cvFeedback";

export type BuilderSectionId =
  | "personal"
  | "experience"
  | "education"
  | "skills"
  | "certifications"
  | "hospitality";

export type CheckerFixKind =
  | "missing-contact"
  | "missing-summary"
  | "missing-quantified"
  | "missing-cert"
  | "missing-keyword"
  | "generic";

export interface CheckerFix {
  id: string;
  title: string;
  explanation: string;
  priority: "high" | "medium" | "low";
  targetSection: BuilderSectionId;
  kind: CheckerFixKind;
  certName?: string;
  keyword?: string;
  completedManually?: boolean;
}

export interface CheckerAudit {
  overallScore: number;
  tier: CvScoreResult["tier"];
  confidence?: ConfidenceResult;
  categories: CvScoreResult["categories"];
  topFixes: string[];
  missingKeywords: string[];
  matchedKeywords: string[];
  deterministicFeedback: string[];
  fixes: CheckerFix[];
}
