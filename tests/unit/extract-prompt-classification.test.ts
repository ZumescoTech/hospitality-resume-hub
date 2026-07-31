/**
 * Bug C (Option A) — source fix in the CV extraction prompt.
 *
 * The same qualification (e.g. "WSET Level 2") was landing in BOTH education and
 * certifications because the extraction prompt told the model to fill both
 * arrays without a rule for dual-natured credentials. This is not a template
 * bug (each array is rendered into exactly one section) and not a copy step —
 * it originates at the extraction layer.
 *
 * A prompt change can't be unit-tested behaviourally (the LLM is not
 * deterministic), so this guards that the disambiguation rule stays in the
 * prompt: a credential belongs in exactly one section, named certifications go
 * under certifications, academic qualifications under education.
 */
import { describe, it, expect } from "vitest";
import { CV_EXTRACT_SYSTEM_PROMPT as P } from "@/lib/ai/extract-prompt";

describe("Bug C — extraction prompt disambiguates education vs certifications", () => {
  it("states each qualification belongs to exactly one section, never both", () => {
    expect(P).toMatch(/exactly one section/i);
    expect(P).toMatch(/never both/i);
  });

  it("routes named certifications to the certifications array", () => {
    // A few representative hospitality/cruise certs must be named as the guide.
    expect(P).toMatch(/WSET/);
    expect(P).toMatch(/STCW/);
    expect(P).toMatch(/certifications["'” ]* only/i);
  });

  it("routes formal academic qualifications to education", () => {
    expect(P).toMatch(/degree|diploma/i);
    expect(P).toMatch(/education/);
  });
});
