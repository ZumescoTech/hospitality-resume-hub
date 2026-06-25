# GetHired — Spec 06: ATS Score Ring

> **Phase 3A** · Requires all Phase 1 and Phase 2 specs to be complete first.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> The ATS scoring logic already exists — see `@docs/01-ai-phrasing-engine.md` and `@docs/03-job-match-mode.md` for the scoring mechanism. This spec only changes how the score is **displayed**. Do not change the scoring algorithm.

---

## Problem statement

The current ATS score display is a bar or a number — utilitarian, forgettable, and low-drama at a moment that should feel like a win. On mobile, a horizontal bar is hard to read at small widths. And the feedback that follows the score — the list of things to fix — is presented as a wall of text that overwhelms users rather than motivating them.

A circular progress ring with an animated count-up transforms the score from a piece of data into a moment of feedback. It works at any screen size. And three specific, actionable fix suggestions below it replace the wall of text with a clear next-step agenda.

---

## Goals

- Replace the existing ATS score display with an animated circular progress ring
- Add a count-up animation to the score number
- Show exactly 3 ranked fix suggestions below the ring, actionable and specific
- Colour-code the ring by score range (red / amber / green)
- Make the component fully mobile-responsive

## Non-goals

- Do not change the ATS scoring logic or what score is returned
- Do not change what triggers the score calculation
- Do not add more than 3 fix suggestions — more is noise
- Do not add gamification points or badges in this spec

---

## Investigation phase (run before writing any code)

1. Where is the current ATS score displayed — which component file, and what is the current visual implementation (bar, number, text)?
2. What does the ATS score API/function return — a single number (0–100), a letter grade, or a structured object? Provide the return type.
3. Does the scoring function also return fix suggestions, or only a score? If it returns suggestions, what is their format?
4. Is the ATS score shown inline in the builder, on a separate results page/route, or in a modal?
5. Does the existing score display update live as the user edits their CV, or is it calculated once on demand?

Return answers as a numbered list before writing any code.

---

## Requirements

### P0 — must ship

**P0-1: Circular progress ring**
- SVG-based circular progress ring — do not use a canvas element or a third-party chart library
- Ring dimensions: 160px × 160px on desktop, 140px × 140px on mobile
- Ring track (background): `#e2e8f0`, stroke-width 12px
- Ring progress arc: colour-coded by score (see P0-2), stroke-width 12px
- Score number centred inside the ring: 36px, font-weight 500, colour matches ring colour
- Label below the score number inside the ring: "ATS Score" in 11px `#94a3b8`
- `stroke-linecap: round` on the progress arc

**P0-2: Score colour bands**
- 0–49: red `#e24b4a` (ring arc + score number)
- 50–74: amber `#ef9f27` (ring arc + score number)
- 75–100: green `#1d9e75` (ring arc + score number)
- The ring track colour does not change — always `#e2e8f0`

**P0-3: Count-up animation**
- When the score component mounts or the score value changes, animate the score number from 0 to the final value
- Duration: 1200ms, easing: ease-out
- The ring arc animates in sync with the number — it fills as the number counts up
- Implementation: `requestAnimationFrame` loop — do not use a library
- Respect `prefers-reduced-motion`: if the user has reduced motion enabled, show the final score immediately with no animation

**P0-4: Fix suggestions**
- Exactly 3 fix suggestions are shown below the ring
- Each suggestion is a card with:
  - A priority badge: "Fix 1", "Fix 2", "Fix 3" in `#ede9fe` / `#5b21b6`
  - The suggestion text: concise, ≤15 words, action-first ("Add your STCW Basic Safety Training certificate")
  - An impact label: "High impact" / "Medium impact" in 11px
- Suggestions are ordered by impact (highest first)
- If the score function returns more than 3 suggestions, show only the top 3
- If the score function returns fewer than 3 suggestions (e.g. for a high-scoring CV), show only what is returned — do not pad with generic advice
- The suggestion cards are not interactive in this spec (no "fix this now" links — P1)

**P0-5: Layout**
- Ring centred horizontally above the fix suggestions
- Fix suggestion cards in a vertical stack below the ring, full width of the component
- Component max-width: 480px, centred in its container
- On screens narrower than 480px: component is full-width, ring scales down to 140px

**P0-6: Score label below ring**
- Below the ring and above the fix suggestions: a short contextual label in 14px
  - 0–49: "Your CV needs work before applying"
  - 50–74: "Getting there — a few changes will help"
  - 75–89: "Strong CV — a couple of tweaks left"
  - 90–100: "Excellent — your CV is application-ready"

### P1 — ship in same PR if time allows

**P1-1: "Fix this" deep link**
- Each fix suggestion card has a "Fix this →" text link on the right
- Tapping the link navigates to the relevant builder step and scrolls to the relevant field
- Example: "Add your STCW certification" links to step 4 and scrolls to the certifications section

**P1-2: Live score updates**
- If the score is calculated live (updates as the user edits), re-trigger the count-up animation on each score change
- Debounce re-animation: only re-animate if the score changes by ≥5 points, to avoid constant animation from small edits

### P2 — log as follow-up, do not build now

- Score history chart (session-based improvement over time)
- "Your score improved by X points" badge after edits

---

## Acceptance criteria

- [ ] **AC-1:** The circular ring renders at 160px on desktop and 140px on mobile. The track and arc are visible.
- [ ] **AC-2:** A score of 45 shows the ring arc in red (`#e24b4a`). A score of 65 shows amber. A score of 82 shows green.
- [ ] **AC-3:** On mount, the score number animates from 0 to the final value over approximately 1200ms. The arc fills in sync.
- [ ] **AC-4:** With `prefers-reduced-motion: reduce` active, the score appears immediately at its final value with no animation.
- [ ] **AC-5:** Exactly 3 fix suggestions are shown (or fewer if the scorer returns fewer). Each has a priority badge, suggestion text (≤15 words), and impact label.
- [ ] **AC-6:** The contextual label below the ring matches the correct score band.
- [ ] **AC-7:** On a 375px viewport, the component is full-width and the ring does not overflow its container.
- [ ] **AC-8:** Fix suggestions are ordered highest impact first.

---

## Technical notes

- The SVG ring arc is drawn using `stroke-dasharray` and `stroke-dashoffset`. The circumference is `2 × π × r` where `r` is the ring radius. Set `stroke-dasharray` to the circumference, and animate `stroke-dashoffset` from the circumference down to `circumference × (1 - score/100)`.
- The count-up uses `requestAnimationFrame`. Pseudocode:
  ```
  const start = performance.now()
  const duration = 1200
  function step(now) {
    const progress = Math.min((now - start) / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)  // ease-out cubic
    currentScore = Math.round(targetScore * eased)
    // update DOM
    if (progress < 1) requestAnimationFrame(step)
  }
  requestAnimationFrame(step)
  ```
- Do not use `setInterval` for the animation — it is not frame-synced and causes jank on mobile.
- The SVG must have `role="img"` and an `aria-label` of "ATS score: [score] out of 100" for screen readers.
