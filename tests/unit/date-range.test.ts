// @vitest-environment node
/**
 * Bug D — Date range formatting when start === end.
 *
 * "2021 – 2021" / "2024 – 2024" read as if something both started and ended in
 * the same year, when it's really a single-year completion. The shared
 * dateRange() utility (src/components/templates/utils.ts) collapses equal
 * start/end to a single value; the PDF export prints these same templates.
 */
import { describe, it, expect } from "vitest";
import { dateRange } from "@/components/templates/utils";

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
