# GetHired — Spec 03: Mobile Preview Modal

> **Phase 1C** · Requires specs 01 and 02 to be complete first.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> The existing preview container is `.print-area.bg-white.shadow-elegant`. The existing template swatch pattern is `#swatch-{name}` buttons with `border-primary` indicating the active swatch. Do not break either of these.

---

## Problem statement

On desktop, the current builder shows a split-pane layout: editor on the left, live preview on the right. On mobile, this split either collapses into an unusably small preview panel squeezed beside the form, or hides the preview entirely.

The result: mobile users are filling in a form with no idea what their CV looks like until they download it. This breaks trust and increases abandonment at the download step when users are disappointed by the output.

---

## Goals

- On mobile, give users a full-screen preview of their CV at any point during building
- Keep the template switcher accessible inside the preview on mobile
- On desktop, preserve the existing split-pane behaviour exactly — no regressions
- The preview must reflect the current builder state in real time

## Non-goals

- Do not change the desktop layout
- Do not change the preview rendering logic (`.print-area`) — only the container around it
- Do not add new templates in this spec — that is spec 04
- Do not add a download button inside the mobile preview modal — the download lives in the bottom CTA bar (spec 01, step 5)

---

## Investigation phase (run before writing any code)

1. How is the existing split-pane layout achieved — CSS Grid, Flexbox, or absolute positioning? Provide the relevant class names or component.
2. Is the preview panel a separate React component or part of the builder parent? Provide the file path.
3. What triggers the preview to update — is it reactive to form state changes, or does it require a manual "Refresh preview" action?
4. How many template swatches currently exist? List their `id` values (pattern `#swatch-{name}`).
5. Is there already a modal component in the codebase? If so, provide the file path — reuse it before creating a new one.
6. On mobile today, what does the user see — a squished preview, no preview, or something else? Describe the current mobile behaviour.

Return answers as a numbered list before writing any code.

---

## Requirements

### P0 — must ship

**P0-1: "Preview CV" floating button (mobile only)**
- On screens narrower than 640px, render a floating "Preview CV" button
- Position: fixed, horizontally centred, 72px above the bottom of the viewport (above the bottom CTA bar from spec 01)
- Appearance: `background: #7c3aed`, white text, `border-radius: 999px`, `padding: 10px 20px`, `font-size: 14px`, shadow `0 2px 8px rgba(0,0,0,0.15)`
- Icon: eye icon (Tabler `ti-eye`) to the left of the text
- Tap opens the mobile preview modal (P0-2)
- This button is hidden on screens ≥640px

**P0-2: Mobile preview modal**
- Full-screen modal (100vw × 100dvh) that slides up from the bottom when opened
- Animation: `transform: translateY(100%)` → `translateY(0)`, 250ms ease-out. No JS animation libraries.
- Background: white
- The modal contains, in order from top to bottom:
  1. A top bar with a "← Back to editing" link (left) and "Preview" label (centre)
  2. The template swatch row (P0-3)
  3. The CV preview (the existing `.print-area` component, rendered at full mobile width)
- The back link closes the modal and returns to the builder step the user was on

**P0-3: Template swatch row inside modal**
- Horizontally scrollable row of template swatches
- Each swatch is a small thumbnail (52×68px) with the template name below it in 11px text
- The active swatch has a `2px solid #7c3aed` border
- Tapping a swatch updates the active template using the existing `#swatch-{name}` mechanism — do not duplicate this logic, trigger the existing swatch handler
- Show a "Loading preview…" overlay on the `.print-area` while the template change re-renders (if re-render is async)

**P0-4: Desktop split-pane unchanged**
- On screens ≥640px, the layout must be exactly as it was before this spec — no regressions
- The template swatches remain in their existing desktop position
- The existing `.print-area` preview remains in its existing desktop container

**P0-5: Real-time preview updates**
- When the user changes a field in the builder and the preview is open on mobile, the preview reflects the change
- If the preview is not open, it should still update in the background so it is current when the user opens it
- Do not add polling — the update should be driven by the existing state management mechanism

### P1 — ship in same PR if time allows

**P1-1: Pinch-to-zoom on mobile preview**
- Allow standard browser pinch-to-zoom within the preview modal
- Set `touch-action: pan-y pinch-zoom` on the `.print-area` when rendered inside the modal
- Do not implement custom zoom logic

**P1-2: Swipe-down to dismiss**
- Swipe down on the modal closes it (returns to builder)
- Threshold: modal dragged more than 120px downward before release triggers close
- Snap back if threshold not reached

### P2 — log as follow-up issues, do not build now

- Side-by-side template comparison mode
- "Share preview link" button inside the modal

---

## Acceptance criteria

- [ ] **AC-1:** On a 375px viewport, the "Preview CV" button is visible and fixed above the bottom CTA bar. It does not overlap or obscure form fields.
- [ ] **AC-2:** Tapping "Preview CV" opens the full-screen modal. The animation completes within 300ms.
- [ ] **AC-3:** The template swatch row is visible in the modal and scrolls horizontally. All existing swatches are accessible.
- [ ] **AC-4:** Tapping a swatch in the modal changes the active template in the preview without closing the modal.
- [ ] **AC-5:** Tapping "← Back to editing" closes the modal and returns the user to the step they were on. No builder state is lost.
- [ ] **AC-6:** On a 1024px viewport, the mobile preview button is not rendered. The desktop split-pane layout is unchanged.
- [ ] **AC-7:** Editing a field on step 2, then opening the preview, shows the updated content in the preview.

---

## Technical notes

- The modal must be rendered in a React portal (`ReactDOM.createPortal`) attached to `document.body` to avoid z-index conflicts with the fixed bottom CTA bar.
- Use `dvh` units (dynamic viewport height) for the modal height, not `vh`, to avoid issues with mobile browser chrome (address bar, navigation bar) shifting the modal.
- Close the modal on browser back button press — push a history entry on open, listen for `popstate` to close.
- Do not use `overflow: hidden` on `<body>` when the modal is open — on iOS Safari this causes the page behind to jump. Use `position: fixed; width: 100%` on the body instead, restoring scroll position on close.
