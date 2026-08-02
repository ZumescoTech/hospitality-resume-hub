// @vitest-environment node
/**
 * Bug A — Job entry split across a page break (Executive / single-column).
 *
 * A job entry (role + dates + venue + bullets) must stay together as one unit
 * when react-pdf paginates. Without `wrap={false}` on the entry's wrapping
 * <View>, react-pdf breaks the entry mid-way: with the full 4-job sommelier
 * fixture the last entry's role/venue land at the bottom of page 1 while its
 * bullets flow to the top of page 2.
 *
 * The single-column experience block is shared by all single-column templates
 * (vintage, winelands, noir-premium, executive, admiral) AND the header-band
 * layout (steward). The sidebar layout (harbour) has its own copy. The guard
 * runs against every template so no layout can regress.
 */
import { describe, it, expect } from "vitest";
import { sommelierFourJobs } from "../fixtures/sommelierFourJobs";
import {
  renderPdfBuffer,
  extractTextItemsByPage,
  findPageContaining,
  type PdfTextItem,
} from "../helpers/renderPdf";

const ALL_TEMPLATES = [
  "vintage",
  "winelands",
  "noir-premium",
  "executive",
  "admiral",
  "steward",
  "harbour",
] as const;

/** First ~36 chars of a string — enough to locate a bullet uniquely. */
const head = (s: string) => s.slice(0, 36);

/** The set of distinct pages an entry's parts appear on (should be size 1). */
function entryPages(pages: PdfTextItem[][], e: (typeof sommelierFourJobs.experience)[number]): Record<string, number> {
  const parts: Record<string, string> = {
    role: e.role,
    venue: e.venue,
    firstBullet: head(e.bullets![0]),
    lastBullet: head(e.bullets![e.bullets!.length - 1]),
  };
  const out: Record<string, number> = {};
  for (const [k, needle] of Object.entries(parts)) out[k] = findPageContaining(pages, needle);
  return out;
}

describe("Bug A — job entries are not split across page breaks", () => {
  it.each(ALL_TEMPLATES)("%s: every job entry stays on a single page", async (templateId) => {
    const pages = await extractTextItemsByPage(await renderPdfBuffer(sommelierFourJobs, templateId));
    expect(pages.length).toBeGreaterThan(1); // fixture must actually span pages, else the test proves nothing

    for (const e of sommelierFourJobs.experience) {
      const p = entryPages(pages, e);
      const distinct = new Set(Object.values(p));
      expect(
        distinct.size,
        `entry "${e.role} @ ${e.venue}" is split across pages: ${JSON.stringify(p)}`,
      ).toBe(1);
    }
  });
});
