// @vitest-environment node
/**
 * Bug B — Harbour strands a small section on a near-empty trailing page.
 *
 * With the real 5-job wine/hospitality CV (tinoCv), Harbour's sidebar layout
 * renders 3 pages: the "Hospitality Profile" heading lands at the bottom of
 * page 2 and its single content row ("Wine knowledge — Intermediate") spills
 * alone onto page 3, leaving it near-empty.
 *
 * Root cause (diagnosed): the content overflows two pages by a hair, and the
 * section heading/row split across the page boundary. NOT caused by the outer
 * row's `minHeight: "100%"` (removing it changed nothing).
 *
 * Fix target: the CV fits in 2 pages AND the Hospitality Profile section stays
 * together (heading + rows on one page).
 */
import { describe, it, expect } from "vitest";
import { tinoCv } from "../fixtures/tinoCv";
import { renderPdfBuffer, extractTextItemsByPage, findPageContaining } from "../helpers/renderPdf";

describe("Bug B — Harbour does not strand the Hospitality Profile on a trailing page", () => {
  it("renders the real 5-job CV in no more than 2 pages", async () => {
    const pages = await extractTextItemsByPage(await renderPdfBuffer(tinoCv, "harbour"));
    expect(pages.length).toBeLessThanOrEqual(2);
  });

  it("keeps the Hospitality Profile heading and its content on the same page", async () => {
    const pages = await extractTextItemsByPage(await renderPdfBuffer(tinoCv, "harbour"));

    const headingPage = findPageContaining(pages, "HOSPITALITY PROFILE");
    const rowPage = findPageContaining(pages, "Wine knowledge");

    expect(headingPage).toBeGreaterThan(0);
    expect(rowPage).toBeGreaterThan(0);
    expect(
      rowPage,
      `Hospitality Profile split: heading on page ${headingPage}, content on page ${rowPage}`,
    ).toBe(headingPage);
  });

  it("does not leave a near-empty trailing page", async () => {
    const pages = await extractTextItemsByPage(await renderPdfBuffer(tinoCv, "harbour"));
    const last = pages[pages.length - 1];
    // A real trailing page carries meaningful content, not one stranded label+value.
    expect(last.length).toBeGreaterThan(8);
  });
});
