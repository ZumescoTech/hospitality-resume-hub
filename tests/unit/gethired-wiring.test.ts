import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const checkerSource = readFileSync("src/routes/tools/cruise-cv-checker.tsx", "utf8");
const builderSource = readFileSync("src/routes/builder.tsx", "utf8");

describe("GetHired CRM release wiring", () => {
  it("passes CV-derived identity into the consented WhatsApp capture", () => {
    expect(checkerSource).toContain("candidateName={parsedCv?.personal.fullName}");
    expect(checkerSource).toContain("emailFromCv={parsedCv?.personal.email}");
  });

  it("tracks builder open, edit/import, and successful export stages", () => {
    expect(builderSource).toContain("trackActiveJourney('builder_opened'");
    expect(builderSource).toContain("trackActiveJourney('cv_edited'");
    expect(builderSource).toContain("trackActiveJourney('exported'");
    expect(builderSource.indexOf("trackEvent('export_succeeded')")).toBeLessThan(
      builderSource.indexOf("trackActiveJourney('exported'"),
    );
  });
});
