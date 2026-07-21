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

## (c) Desktop preview pane does not stick on scroll

`.preview-panel-outer` is `position: sticky` at >=1024px, but it never sticks —
it scrolls away with the page. Measured at 1280x900: pane top resolves to
**-608 after scrolling 700px**, i.e. it moves 1:1 with the document.

**Root cause:** `html, body { overflow-x: hidden }` (`src/styles.css:146`).
When one overflow axis is `hidden` and the other is `visible`, the visible axis
computes to `auto`, which makes `body` a scroll container — and a scroll
container becomes the sticky scrollport for every descendant. The pane's `top`
is therefore measured against `body` rather than the viewport, so sticky never
engages relative to the screen.

Confirmed by direct measurement on the pane at 1280px:

| position | resulting top |
|---|---|
| `static` | 92 |
| `sticky`, `top: 92px` | 184 |
| `sticky`, `top: 0` | 92 |

The offset being *added* to the flow position is the signature of a scrollport
that is not the viewport.

**Not a regression.** The rule predates the CV builder rebuild and the pane
never stuck on `main`. It surfaced during Step 8 only because that step was the
first to anchor anything (the Customize trigger, the contained drawer sheet) to
the pane's bottom edge.

**Two possible fixes, neither in scope for the builder rebuild:**

1. **Sitewide `overflow-x: clip`** on `html, body`. `clip` suppresses the same
   horizontal overflow without establishing a scrollport, so sticky resolves
   against the viewport again. This is the same fix already applied locally to
   `.builder-layout` in commit `3c5ddd9`. Risk: `hidden` on `html, body` is
   usually load-bearing against some specific element overflowing — removing it
   sitewide can reintroduce a horizontal scrollbar on any page. **Must be
   verified across every route, not just `/builder`**, at 375/850/1280.
2. **Restructure the sticky context for the builder route only** — give the
   builder its own scroll container so the pane's scrollport is well-defined,
   and leave the global rule alone. Smaller blast radius, more layout work.

**Action:** separate task. Option 1 is cheaper but needs a full-route sweep for
horizontal overflow before it can be trusted; option 2 is contained but touches
builder layout again. Decide which before starting.

---

*Logged: 2026-07-05 (items a, b), 2026-07-21 (item c). All deferred — (a) and
(b) past B-0/R-1 close-out, (c) out of scope for the CV builder rebuild.*
