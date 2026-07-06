# GetHired — Per-CV Judging Protocol
*How each CV in `cv-tests/` is run and scored. Commit to `docs/cv-judging-protocol.md`. Referenced by the release loop.*

The judge model is the app's own Groq `llama-3.3-70b-versatile`, called at **temperature 0, JSON-only**. It is text-only, so it scores text quality and the five comparison questions. It does **not** score visual design, overflow, or print. Those are AUTO (rendered-image measurement) plus MANUAL spot-check. Because the judge shares the app's model, the hallucination gate is decided first by a deterministic diff, not by the model.

---

## 1. The two passes

For each CV file, run the full journey twice and capture the generated PDF's extracted text each time.

**Baseline pass** — upload → parse → populate editor → generate → download. No tailoring. Measures: parsing fidelity, information retention, and whether the raw generated document is sound (Functional, ATS-parse, Design).

**Assisted pass** — same, then invoke Tailor (`tailorContentFn`) and Writing-check (`checkWritingFn`) on the relevant fields, accept the suggestions, regenerate, download. Measures: AI quality (grammar, tone, stronger bullets, better summaries) and, critically, hallucination.

Capture three text artifacts per CV: `source_text` (extracted from the original upload), `baseline_text` (from the baseline PDF), `assisted_text` (from the assisted PDF).

---

## 2. Deterministic pre-checks (run before the LLM judge)

These do not use the model and back up two things the model is worst at.

**2a. Information-loss check.** Extract structured fields from `source_text` and compare against the populated editor state / `baseline_text`: candidate name, every employer, every role title, every date range, education, certifications, contact details. Any source field absent from the output is an information-loss finding (and fails Parsing accuracy if a whole role/section is dropped).

**2b. Hallucination check (hard-gate primary detector).** Build the set of named entities and numbers (employers, institutions, certifications, dates, quantified figures) present in `assisted_text` but **not** traceable to `source_text`. The tailoring prompt is allowed to insert bracketed placeholders like `[X covers/shift]`; those are permitted. Any concrete fabricated employer, date, credential, or invented metric is a **hard-gate failure**. Flag it with the exact fabricated string and its surrounding sentence.

Only after these run does the LLM judge score the qualitative dimensions.

---

## 3. LLM judge — system prompt

Send this as the system message; send the data as the user message. Temperature 0. Parse the JSON out of the response with the app's existing robust JSON extractor.

```
You are a strict, evidence-based CV evaluation judge for a hospitality and cruise-ship
resume tool. You compare an ORIGINAL CV against a GENERATED CV and score specific
dimensions. You must ground every score in quoted before/after evidence. You never
reward invented facts. If you cannot verify something from the text provided, score it
conservatively and say so. Output JSON only, no prose, no markdown fences.

Scoring is 1 to 5 where 5 is excellent and 1 is broken. Return this exact shape:

{
  "comparison": {
    "information_retained": { "score": 1-5, "evidence": "what if anything was lost" },
    "wording_improved":     { "score": 1-5, "evidence": "before -> after quote" },
    "no_hallucination":     { "score": 1-5, "evidence": "anything not in the original, or 'none found'" },
    "stronger_overall":     { "score": 1-5, "evidence": "why" },
    "recruiter_preference": { "score": 1-5, "evidence": "which version a hospitality recruiter prefers and why" }
  },
  "ai_quality": {
    "grammar":         { "score": 1-5, "evidence": "" },
    "professional_tone": { "score": 1-5, "evidence": "" },
    "stronger_bullets":  { "score": 1-5, "evidence": "before -> after quote" },
    "better_summary":    { "score": 1-5, "evidence": "before -> after quote" }
  },
  "ats_text": {
    "keywords":        { "score": 1-5, "evidence": "role keywords present or missing" },
    "structure":       { "score": 1-5, "evidence": "" },
    "section_ordering":{ "score": 1-5, "evidence": "" },
    "readability":     { "score": 1-5, "evidence": "" }
  },
  "flags": ["any concern, especially suspected fabrication, that a human must review"]
}

Rules:
- Judge only the text given. Do not assume facts not present.
- "Stronger" never means "more embellished". Inflated or unverifiable claims lower the
  score, they do not raise it.
- For no_hallucination, a 5 means every claim in the generated CV traces to the original.
  Any fabricated employer, date, credential, or number is a 1 and must appear in flags.
- Quote real substrings as evidence. Do not paraphrase the evidence.
```

**User message contents:** the target role/slug, then `ORIGINAL:` + `source_text`, then `GENERATED (assisted):` + `assisted_text`. For the baseline pass, send `baseline_text` and skip the `ai_quality` fields (there is no tailoring to grade), scoring only comparison + ats_text.

---

## 4. Stability and integrity

- **Median of three.** Run the judge three times per CV per pass and take the median of each score. Groq is not perfectly deterministic even at temperature 0.
- **No overfitting.** Never feed the `tests/fixtures/cv-scoring/` expected bands or any fixture as a few-shot example to the judge or the app. Fixtures validate scoring; they are not prompts.
- **Anti-collapse.** Cross-check judge scores against the existing fixture bands in `tests/unit/b1-scoring-fixtures.test.ts`. If the strongest CV and the negative control land within 15 points of each other, the scoring is collapsing and that is a finding.
- **Evidence required.** Any score of 4 or 5 on a comparison dimension with empty evidence is invalid; re-run.

---

## 5. What this protocol does NOT decide

Visual design (typography, white space, alignment, professional appearance), overflow/clipping, multi-page handling, and print quality are not sent to the text judge. They are scored by AUTO rendered-image measurement in the loop, with aesthetic judgement and print flagged **MANUAL**. Do not let a high text-judge score imply the document looks good on the page.

---

## 6. How scores map to the rubric

- `comparison.*` and `ai_quality.*` → the **AI** category, plus `comparison.information_retained` feeds **Functional / Parsing accuracy**.
- `ats_text.*` → the **ATS** category (alongside the AUTO PDF-parse check).
- `no_hallucination` (median) plus the 2b deterministic result → the **no-hallucination hard gate**. The deterministic result wins: if 2b finds fabrication, the gate fails regardless of the model's score.
