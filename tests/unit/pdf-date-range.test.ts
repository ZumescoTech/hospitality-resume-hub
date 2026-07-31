// @vitest-environment node
/**
 * Bug D — Date range formatting when start === end.
 *
 * "2021 – 2021" / "2024 – 2024" read as if something both started and ended in
 * the same year, when it's really a single-year completion. The shared
 * dateRange() utility (src/components/templates/utils.ts) is used for experience
 * dates across ResumePDF and all 7 preview templates; ResumePDF's *education*
 * dates used a separate inline join (" – "), so both paths are covered:
 *  - dateRange() collapses equal start/end to a single value (unit tests).
 *  - Every PDF template renders a same-year education entry without a
 *    dash-separated duplicate (integration tests).
 */
import { describe, it, expect } from "vitest";
import { dateRange } from "@/components/templates/utils";
import { emptyResume, type ResumeData } from "@/types/resume";
import { renderPdfBuffer, extractTextItemsByPage, pageText } from "../helpers/renderPdf";

describe("Bug D — dateRange collapses equal start/end", () => {
  it("collapses a same-year range to a single year", () => {
    expect(dateRange("2021", "2021")).toBe("2021");
    expect(dateRange("2024", "2024")).toBe("2024");
    // No dash of any kind when collapsed.
    expect(dateRange("2021", "2021")).not.toMatch(/[–—-]/);
  });

  it("collapses a same-month range to a single formatted month", () => {
    expect(dateRange("2021-05", "2021-05")).toBe("May 2021");
  });

  it("still renders a real range when start and end differ", () => {
    expect(dateRange("2018", "2019")).toBe("2018 — 2019");
    expect(dateRange("2018", "", true)).toBe("2018 — Present");
  });

  it("handles single-sided and empty input", () => {
    expect(dateRange("2020", "")).toBe("2020");
    expect(dateRange("", "2024")).toBe("2024");
    expect(dateRange("", "")).toBe("");
  });
});

// ── Integration: every PDF template renders a same-year education entry
//    without a dash-separated duplicate. ──────────────────────────────────────
const ALL_TEMPLATES = [
  "vintage",
  "winelands",
  "noir-premium",
  "executive",
  "admiral",
  "steward",
  "harbour",
] as const;

const sameYearEdu: ResumeData = {
  ...emptyResume,
  personal: {
    fullName: "Date Test",
    title: "Waiter",
    email: "d@example.com",
    phone: "+1 555 0100",
    location: "Miami",
    photo: undefined,
    links: [],
  },
  experience: [
    {
      id: "e1",
      role: "Waiter",
      venue: "The Grill",
      location: "Miami",
      startDate: "2018",
      endDate: "2020",
      description: "Served tables.",
    },
  ],
  education: [
    // Same-year completion — must collapse to "2019", never "2019 – 2019".
    { id: "ed1", school: "Cape Wine Academy", degree: "WSET Level 2", field: "", startDate: "2019", endDate: "2019" },
  ],
  templateId: "vintage",
};

async function allPagesText(templateId: string): Promise<string> {
  const pages = await extractTextItemsByPage(await renderPdfBuffer(sameYearEdu, templateId));
  return pages.map(pageText).join(" ").replace(/\s+/g, "");
}

describe("Bug D — PDF templates do not render a same-year education duplicate", () => {
  it.each(ALL_TEMPLATES)("%s: no '2019<dash>2019' in the rendered education date", async (templateId) => {
    const text = await allPagesText(templateId);
    expect(text).toContain("WSETLevel2"); // the entry rendered at all
    expect(text).not.toContain("2019–2019"); // en dash
    expect(text).not.toContain("2019—2019"); // em dash
    expect(text).not.toContain("2019-2019"); // hyphen
  });
});
