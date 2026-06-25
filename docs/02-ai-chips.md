# GetHired — Spec 02: AI Phrasing Chips

> **Phase 1B** · Requires spec 01 (step wizard) to be complete first.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> The AI phrasing engine (role detection, 6 role families, prompt library) was built in an earlier phase — see `@docs/01-ai-phrasing-engine.md`. This spec only changes how that engine's output is **presented** to the user. Do not rebuild the engine.

---

## Problem statement

The AI phrasing engine exists and works — it generates role-specific, metric-grounded bullet point suggestions. But users cannot find it. It is either buried in a secondary menu, accessible only after a specific action, or not visible at all in the current builder UI.

The result: our single biggest competitive advantage over Zety and Resume.io is invisible to the people who need it most.

This spec surfaces the engine's output as visible, tap-to-insert chips directly below the work experience description textarea on step 2 of the wizard.

---

## Goals

- Make the AI phrasing engine output visible without any user action required
- Allow users to tap a chip to insert the suggestion into the textarea
- Keep the chip UI out of the way when the user is typing
- Show role-appropriate chips (not generic ones) based on the user's role slug

## Non-goals

- Do not change the phrasing engine's prompt logic or output format
- Do not add a chat interface or free-text prompt input — chips only in this spec
- Do not apply chips to any field other than the work experience description textarea
- Do not add chips to the skills or certifications steps

---

## Investigation phase (run before writing any code)

1. Where does the existing AI phrasing engine expose its output? Is there a function, API route, or hook that returns suggestions? Provide the file path and the return type.
2. What is the role-family slug currently stored as, and where — in the builder state, in localStorage, in a URL param, or elsewhere?
3. Is there already any chip/tag/suggestion UI component in the codebase? If so, provide the file path — reuse it if suitable.
4. Does the current experience textarea have an `id` or `data-` attribute? If so, what is it?
5. Are AI suggestions currently fetched on component mount, on user typing, or on demand?

Return answers as a numbered list before writing any code.

---

## Requirements

### P0 — must ship

**P0-1: Chip container**
- Render a chip container immediately below the work experience description textarea
- The container is always visible when the textarea is focused or has content — it does not require a button press to reveal
- Label above the chips: "Suggestions for [role label]" in 12px slate grey — e.g. "Suggestions for Waiter", "Suggestions for Sommelier"
- Show a maximum of 3 chips at a time

**P0-2: Chip appearance**
- Each chip: `background: #ede9fe`, `color: #5b21b6`, `border-radius: 999px`, `padding: 6px 14px`, `font-size: 13px`
- Each chip has a ✦ sparkle icon (use existing Tabler icon `ti-sparkles` or SVG equivalent) to the left of the text
- Chip text is the suggestion truncated to 60 characters with "…" if longer — tapping opens full text in a modal or expands the chip (see P1-1)
- Minimum touch target: 44px height (use padding to achieve this, not a fixed height that breaks wrapping)
- Chips wrap horizontally; do not scroll horizontally

**P0-3: Tap to insert**
- Tapping a chip appends the full suggestion text to the end of the textarea content, preceded by a newline if the textarea is not empty
- After insertion: the tapped chip dims to 40% opacity and is no longer tappable (prevents double-insert)
- The textarea receives focus after insertion
- Auto-save fires immediately after insertion (do not wait for blur)

**P0-4: Role-aware chips**
- Chips are fetched using the role-family slug from the existing phrasing engine
- If no slug is available (user has not set a role yet), show a generic fallback set of 3 chips drawn from the existing generic fallback in `@docs/01-ai-phrasing-engine.md`
- Do not hardcode chip text — always call the existing engine function

**P0-5: Loading state**
- While chips are being fetched, show 3 skeleton placeholder chips (same size, grey `#e2e8f0` background, no text, subtle pulse animation)
- If fetch fails or times out after 5 seconds, hide the chip container entirely — do not show an error state in the chip area

**P0-6: Refresh chips**
- Below the chip row, show a text link: "Show different suggestions ↻"
- Tapping this fetches a new set of 3 chips from the engine (the engine should support returning a different set on subsequent calls — verify in investigation phase)
- The link is hidden while chips are loading

### P1 — ship in same PR if time allows

**P1-1: Full suggestion on tap-hold (mobile) or hover (desktop)**
- On mobile: tap-and-hold a chip for 300ms to reveal the full suggestion text in a bottom sheet or tooltip
- On desktop: hover reveals full text in a tooltip above the chip
- The bottom sheet / tooltip has an "Insert" button so the user can insert from the expanded view

**P1-2: Chip per experience entry**
- If the user has added multiple work experience entries ("Add another role"), each entry's textarea gets its own chip set
- The chip set for each entry uses the job title of that entry to fetch role-specific chips (not the global role slug)

### P2 — log as follow-up issues, do not build now

- Chips above the skills textarea suggesting role-specific skills keywords
- User ability to thumbs-down a chip to remove it from future suggestions

---

## Acceptance criteria

- [ ] **AC-1:** On step 2, with a Waiter role slug set, the chip container is visible below the experience textarea without any user action. It shows "Suggestions for Waiter" and 3 chips.
- [ ] **AC-2:** The chips shown for a Waiter are different from those shown for a Bartender. Confirm with two role slugs.
- [ ] **AC-3:** Tapping a chip appends the full suggestion to the textarea. The chip dims and becomes non-interactive.
- [ ] **AC-4:** Auto-save fires within 500ms of a chip insertion.
- [ ] **AC-5:** With no role slug set, 3 generic fallback chips are shown (not an error, not empty).
- [ ] **AC-6:** If chip fetch takes longer than 5 seconds, the chip container is hidden — no error message is visible to the user.
- [ ] **AC-7:** Tapping "Show different suggestions ↻" replaces the current chips with a new set. The previously inserted chip is not shown again in the new set.
- [ ] **AC-8:** On a 375px viewport, all 3 chips are visible and have a tap target of at least 44px height.

---

## Technical notes

- Chips should not re-fetch on every render — fetch once when the textarea mounts (on step 2 load) and cache the result in component state for the duration of the session.
- The "Show different suggestions ↻" refresh should pass a `seed` or `offset` parameter to the engine to avoid returning identical chips. If the engine does not support this, add a simple shuffle of the engine's full suggestion pool client-side.
- The dimmed chip state (`opacity: 0.4`, `pointer-events: none`) should be tracked in component state, not by mutating the DOM directly.
- Do not use `dangerouslySetInnerHTML` anywhere in this component.
