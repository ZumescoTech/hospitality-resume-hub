// Example: /api/cruise-cv-check endpoint
//
// This is written as a generic handler — adapt the request/response wiring
// to however your TanStack Start server routes / Cloudflare Worker fetch
// handler are structured. The core logic (load role -> build prompt ->
// call Haiku -> parse) stays the same regardless.

import cruiseRolesData from "./data/cruise-roles.json"; // bundled at build time, zero runtime cost
import {
  buildCvCheckPrompt,
  parseCvCheckResponse,
  type CruiseRolesData,
  type CvCheckResult,
} from "./lib/cruiseCvRubric";

const rolesData = cruiseRolesData as CruiseRolesData;

interface CvCheckRequest {
  cvText: string;
  roleSlug: string;
  jobAdText?: string;
}

export async function handleCruiseCvCheck(
  req: CvCheckRequest,
  env: { ANTHROPIC_API_KEY: string }
): Promise<CvCheckResult> {
  const role = rolesData.roles.find((r) => r.slug === req.roleSlug);

  if (!role) {
    throw new Error(`Unknown role slug: ${req.roleSlug}`);
  }

  const { system, user } = buildCvCheckPrompt({
    cvText: req.cvText,
    role,
    jobAdText: req.jobAdText,
  });

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5", // match whatever model Get Hired's main CV flow already uses
      max_tokens: 2000,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content.find((b: any) => b.type === "text");

  if (!textBlock) {
    throw new Error("No text response from Haiku");
  }

  return parseCvCheckResponse(textBlock.text);
}

// --- Helper: list of roles for the frontend dropdown ---
export function getRoleOptions() {
  return rolesData.roles.map((r) => ({ slug: r.slug, label: r.role }));
}
