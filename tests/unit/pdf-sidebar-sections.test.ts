// @vitest-environment node
/**
 * Bug 2 — Missing sections (Harbour).
 *
 * Harbour is the only premium template with `layout: "sidebar"`, so its PDF is
 * produced by SidebarLayout in ResumePDF.tsx. SidebarLayout renders only
 * summary / experience / education — it never renders Certifications or the
 * Hospitality Profile. The single-column layout renders both from identical
 * data, so every other premium template shows them. Result: real data silently
 * dropped from the exported Harbour CV.
 *
 * These render-level tests assert the two sections (and their content) actually
 * appear in the Harbour PDF. A control assertion confirms a single-column
 * template already renders them, so the test pins the Harbour-specific gap.
 *
 * Note: section headings use letter-spacing, so pdf.js extracts them with
 * spaces between glyphs ("C E R T I F I C AT I O N S"). We compare against a
 * whitespace-stripped copy of the page text so presence checks are robust.
 */
import { describe, it, expect } from "vitest";
import { virginiaMandaza } from "../fixtures/virginiaMandaza";
import { renderPdfBuffer, extractPlainText } from "../helpers/renderPdf";

const compact = (s: string) => s.replace(/\s+/g, "");

describe("Bug 2 — Harbour renders Certifications and Hospitality Profile", () => {
  it("renders the Certifications section with every certification", async () => {
    const text = compact(await extractPlainText(await renderPdfBuffer(virginiaMandaza, "harbour")));

    expect(text).toContain("CERTIFICATIONS");
    expect(text).toContain("FirstAidCertificate");
    expect(text).toContain("STCWBasicSafetyTraining");
    expect(text).toContain("ENG1MedicalCertificate");
  });

  it("renders the Hospitality Profile section with its content", async () => {
    const text = compact(await extractPlainText(await renderPdfBuffer(virginiaMandaza, "harbour")));

    expect(text).toContain("HOSPITALITYPROFILE");
    // Content that only appears in the hospitality profile block.
    expect(text).toContain("Micros");
    expect(text).toContain("Fidelio");
    expect(text).toContain("HACCPLevel2");
  });

  it("does not drop the sections a working sidebar CV already had", async () => {
    const text = compact(await extractPlainText(await renderPdfBuffer(virginiaMandaza, "harbour")));

    // Regression guard: adding sections must not remove the existing ones.
    expect(text).toContain("VirginiaMandaza");
    expect(text).toContain("Housekeeper");
    expect(text).toContain("OrdinaryLevel(O-Level)");
    expect(text).toContain("Stateroomturndown"); // a skill (sidebar)
  });
});

describe("Bug 2 — control: a single-column template already shows both sections", () => {
  it("Admiral renders Certifications and Hospitality Profile", async () => {
    const text = compact(await extractPlainText(await renderPdfBuffer(virginiaMandaza, "admiral")));
    expect(text).toContain("CERTIFICATIONS");
    expect(text).toContain("FirstAidCertificate");
    expect(text).toContain("HOSPITALITYPROFILE");
  });
});
