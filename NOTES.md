# Post-B-0/R-1 Notes (carry into B-1)

Items logged here are OUTSIDE B-0/R-1 scope. Do not fix in the current loop.

---

## (a) Parse-failure copy discrepancy

During PM preview verification, a file-read failure surfaced the OLD toast text:
> "We hit a problem reading your CV. Try a .docx or .txt file, or paste your CV text directly."

The new B-0 wording is:
> "We couldn't analyse this CV right now — please try again."

Two possible explanations (brief investigation needed before B-1):
1. The new wording only fires on ANALYSIS failure (LLM/scoring path), and this was a READ failure (file parsing path) — two separate code paths, each with their own error copy.
2. The new copy is not fully wired — the read-failure path was missed during B-0.

**Action for B-1:** Identify both error paths in the checker (file read vs. analysis), confirm which copy each surfaces, and align them consistently if (2) is the case.

---

## (b) File-read reliability on preview build

During PM browser automation testing, the preview build rejected a valid, in-memory File object (readable via FileReader) with the "hit a problem reading" toast. The same file injection worked on production.

Could be:
- Intentional stricter file validation on the preview build (not a regression).
- A regression introduced during B-0 changes that only manifests on preview.

**Action before promote:** Confirm whether the stricter behaviour is intentional. If not intentional, treat as a regression and fix before promoting preview to production.

---

*Logged: 2026-07-05. Both items deferred past B-0/R-1 close-out.*
