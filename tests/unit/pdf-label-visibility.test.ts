// @vitest-environment node
/**
 * Bug 1 — Invisible label text (Steward, Harbour).
 *
 * The downloadable PDF is built by src/lib/pdf/ResumePDF.tsx. Its per-template
 * colours come from PDF_TEMPLATE_CONFIGS via getConfig(); body label colours
 * (job title, dates, degree, cert name, hospitality label) are derived inside
 * buildStyles() from `nameColour` (-> headingText) and `accent`.
 *
 * For Steward and Harbour those two config fields were set to on-band colours
 * (#ffffff name, #eaf8f5 accent). But the band/sidebar names are hard-coded
 * white in the JSX, so `nameColour` only ever colours *body* labels — which sit
 * on a WHITE page. Result: white-on-white job titles / degrees / cert names and
 * near-invisible pale-mint dates.
 *
 * This is a colour bug, so the primary assertions are at the style source:
 * every label-tier colour must have real contrast against the page background.
 * A secondary render test guards against the text being dropped entirely.
 */
import { describe, it, expect } from "vitest";
import { getConfig, buildStyles } from "@/lib/pdf/ResumePDF";
import { defaultFormatting } from "@/types/formatting";
import { virginiaMandaza } from "../fixtures/virginiaMandaza";
import { renderPdfBuffer, extractPlainText } from "../helpers/renderPdf";

// ── WCAG relative-luminance contrast ratio ──────────────────────────────────
function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}
function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

// Minimum contrast for a label to be legible. #eaf8f5-on-white ≈ 1.05 (fails),
// #0d6b5e-on-white ≈ 4.4 (passes), #1a1a1a-on-white ≈ 16 (passes).
const MIN_CONTRAST = 3;

const AFFECTED = ["steward", "harbour"] as const;

describe("Bug 1 — Steward & Harbour body labels are legible (style source)", () => {
  describe.each(AFFECTED)("template: %s", (templateId) => {
    const config = getConfig(templateId);
    const s = buildStyles(defaultFormatting, config);

    // Label-tier styles whose colour derives from nameColour (headingText) or accent.
    const labelStyles: [string, { color?: string }][] = [
      ["expRole (job title)", s.expRole],
      ["expDates (date range)", s.expDates],
      ["eduDegree (degree name)", s.eduDegree],
      ["certName (certification name)", s.certName],
      ["hospLabel (hospitality label)", s.hospLabel],
    ];

    it.each(labelStyles)("%s has a defined colour", (_name, style) => {
      expect(style.color).toBeDefined();
      expect(typeof style.color).toBe("string");
    });

    it.each(labelStyles)("%s has real contrast against the page background", (_name, style) => {
      const ratio = contrast(style.color as string, config.pageBg);
      expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
    });
  });
});

describe("Bug 1 — label text is present and ordered in the rendered PDF", () => {
  it("Steward: job title, dates, degree, school and cert names all render", async () => {
    const buf = await renderPdfBuffer(virginiaMandaza, "steward");
    const text = await extractPlainText(buf);

    // Presence (guards against the text node being removed, not just recoloured).
    expect(text).toContain("Housekeeper");
    expect(text).toContain("JAN 2018");
    expect(text).toContain("Ordinary Level (O-Level)");
    expect(text).toContain("First Aid Certificate");
    expect(text).toContain("STCW Basic Safety Training");
    expect(text).toContain("ENG1 Medical Certificate");

    // Order: job title before its date, degree before its school.
    expect(text.indexOf("Housekeeper")).toBeLessThan(text.indexOf("JAN 2018"));
    expect(text.indexOf("Ordinary Level (O-Level)")).toBeLessThan(
      text.indexOf("Zonnebloem"),
    );
  });

  it("Harbour: job title, dates, degree and school render in the main column", async () => {
    const buf = await renderPdfBuffer(virginiaMandaza, "harbour");
    const text = await extractPlainText(buf);

    expect(text).toContain("Housekeeper");
    expect(text).toContain("JAN 2018");
    expect(text).toContain("Ordinary Level (O-Level)");
    expect(text.indexOf("Housekeeper")).toBeLessThan(text.indexOf("JAN 2018"));
    expect(text.indexOf("Ordinary Level (O-Level)")).toBeLessThan(
      text.indexOf("Zonnebloem"),
    );
  });
});
