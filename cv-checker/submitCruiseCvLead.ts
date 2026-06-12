// submitCruiseCvLead.ts
//
// Replaces the Supabase write with a POST to the Google Apps Script web app
// webhook. Call this when the user submits their email to unlock the full report.

export interface CruiseCvLead {
  email: string;
  roleSlug: string;
  overallScore: number;
  riskLevel: string;
  topIssues: string[];
  categories: unknown; // the full categories array from CvCheckResult
  utm?: string;
}

export async function submitCruiseCvLead(
  lead: CruiseCvLead,
  env: { GOOGLE_SHEETS_LEAD_WEBHOOK_URL: string }
): Promise<void> {
  const res = await fetch(env.GOOGLE_SHEETS_LEAD_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lead),
    redirect: "follow", // Apps Script web apps issue a redirect on POST
  });

  if (!res.ok) {
    throw new Error(`Lead capture failed: ${res.status}`);
  }

  const result = await res.json();
  if (!result.ok) {
    throw new Error(`Lead capture error: ${result.error}`);
  }
}
