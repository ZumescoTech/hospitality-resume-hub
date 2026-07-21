import { describe, it, expect } from "vitest";
import { ctaLabelFor } from "@/components/builder/BottomCta";

// Step 6 — the CTA label is contextual to the active top-level mode.
// AI Review is not reachable in the UI yet; the mapping is proven here so
// enabling that mode is a one-line change in the builder route.

describe("ctaLabelFor", () => {
  it("shows Download for the Edit mode", () => {
    expect(ctaLabelFor("edit")).toBe("Download");
  });

  it("shows Download for the Preview mode", () => {
    expect(ctaLabelFor("preview")).toBe("Download");
  });

  it("shows Download for the Templates sub-mode", () => {
    expect(ctaLabelFor("templates")).toBe("Download");
  });

  it("shows Get better for the AI Review mode", () => {
    expect(ctaLabelFor("review")).toBe("Get better");
  });
});
