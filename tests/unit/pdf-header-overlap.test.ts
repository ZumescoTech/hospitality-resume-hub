// @vitest-environment node
/**
 * Bug 3 — Header name/subtitle overlap (single-column templates).
 *
 * Affected: Vintage, Winelands (both fall back to the `classic` PDF config),
 * Noir (noir-premium), Executive, Admiral. All five render the single-column
 * header in ResumePDF.tsx: <Text s.name> (fontSize heading+8 = 22) directly
 * above <Text s.jobTitle> (marginTop 3). `s.name` carries no line metrics of
 * its own, so it inherits the page's tight body lineHeight (1.15). At 22pt the
 * name's line advance collapses and the subtitle rides up into it.
 *
 * Measured before fix (pdf.js page space, y up): name baseline ≈ 768.1,
 * subtitle top ≈ 773.3 — the subtitle's top sits ~5.2pt ABOVE the name's
 * baseline, i.e. inside the name. Steward/Harbour are excluded (their names
 * live in a band/sidebar with their own line metrics and don't overlap).
 */
import { describe, it, expect } from "vitest";
import { virginiaMandaza } from "../fixtures/virginiaMandaza";
import { renderPdfBuffer, extractTextItems, findItem } from "../helpers/renderPdf";

const SINGLE_COLUMN = [
  "vintage",
  "winelands",
  "noir-premium",
  "executive",
  "admiral",
] as const;

describe("Bug 3 — header name and subtitle must not overlap vertically", () => {
  it.each(SINGLE_COLUMN)("%s: subtitle sits below the name (no overlap)", async (templateId) => {
    const buf = await renderPdfBuffer(virginiaMandaza, templateId);
    const items = await extractTextItems(buf);

    const nameItem = findItem(items, "Virginia");
    const subItem = findItem(items, "CABIN") ?? findItem(items, "Cabin");

    expect(nameItem, "name text run not found").toBeDefined();
    expect(subItem, "subtitle text run not found").toBeDefined();

    // pdf.js transform[5] = baseline y; +height = top of the glyph box.
    const nameBaseline = nameItem!.transform[5];
    const subTop = subItem!.transform[5] + subItem!.height;

    // The subtitle's TOP edge must sit at or below the name's baseline.
    // (A positive margin means clean separation; negative means overlap.)
    const gap = nameBaseline - subTop;
    expect(
      gap,
      `subtitle top (${subTop.toFixed(1)}) overlaps name baseline (${nameBaseline.toFixed(1)}); gap=${gap.toFixed(1)}`,
    ).toBeGreaterThanOrEqual(0);
  });
});
