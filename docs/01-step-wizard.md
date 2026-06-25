# GetHired — Spec 01: Mobile Step Wizard

> **Phase 1A** · Must be completed before specs 1B and 1C.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> Self-contained for build purposes — only assumptions relevant to this spec are repeated below.

---

## Problem statement

The current builder presents the full CV form as a single long vertical scroll. On mobile (375–430px viewport), this means users scroll through 20+ fields, lose their place, and abandon before completing their CV. There is no progress indication, no auto-save confirmation, and no sense of how much work remains.

This is the single highest-impact change in the premium upgrade. Everything else in this spec set builds on top of this wizard.

---

## Goals

- Replace the current long-form builder with a 5-step wizard flow
- Make progress visible and legible on a mobile screen
- Auto-save user input at every step so no work is ever lost
- Make the primary CTA always reachable with the thumb (bottom of screen on mobile)
- Reduce perceived complexity without removing any fields

## Non-goals

- Do not change what data is collected — only how it is presented
- Do not touch the PDF generation or download logic in this spec
- Do not change the template switcher or preview panel — those are specs 1C and 2A
- Do not introduce any new dependencies unless the existing stack cannot support the change

---

## Investigation phase (run before writing any code)

Claude Code must answer all of the following before writing any implementation code:

1. Is the current builder a single React component or split across multiple? List the relevant component file paths.
2. Where is form state currently stored — React state, a form library (react-hook-form, formik), localStorage, or Cloudflare KV?
3. Is there an existing router (react-router, Next.js App Router, Cloudflare Pages routing)? Confirm how the `/builder` route is resolved.
4. Is there an existing step or tab concept anywhere in the codebase, even partial?
5. What is the current save/persist mechanism — is there an autosave, a save button, or does data only persist on download?

Return answers as a numbered list before writing any code.

---

## The 5 steps

| Step | Label | Fields included |
|---|---|---|
| 1 | Personal info | Full name, headline/role, email, phone, location, LinkedIn URL, profile photo |
| 2 | Work experience | Job title, employer, dates (from/to), description textarea, "Add another role" |
| 3 | Skills | Skills list (tag-style input), language proficiency rows |
| 4 | Certifications | STCW certifications, other certifications, education |
| 5 | Preview & download | Live preview, template swatch row, download button |

> Step 5 is read-only — it shows the assembled CV using existing preview logic. No new fields.

---

## Requirements

### P0 — must ship

**P0-1: Step progress bar**
- Fixed to top of viewport on mobile, static on desktop
- Shows "Step N of 5" as text label on the left
- Shows 5 dot/pill indicators on the right — completed steps filled purple (`#7c3aed`), current step filled with a pulse animation, future steps hollow
- Tapping a completed step dot navigates back to that step (forward navigation only allowed via "Continue" button)

**P0-2: Step content area**
- Only the fields for the current step are rendered in the DOM — do not render all steps and hide them with CSS
- Smooth horizontal slide transition between steps (CSS transition, no library needed)
- Each step has a `<h2>` heading matching the step label in the table above

**P0-3: Bottom CTA bar (mobile only)**
- Fixed to bottom of viewport on screens narrower than 640px (`sm:` breakpoint)
- Contains a single primary button: "Continue →" (steps 1–4) or "Download CV" (step 5)
- Contains a back arrow link to the previous step (hidden on step 1)
- On screens ≥640px, the CTA sits inline below the form fields, not fixed
- Minimum touch target: 48px height on the Continue button

**P0-4: Auto-save**
- Every field triggers a save on the `blur` event (when user leaves the field)
- Save to the existing persistence layer — do not introduce a new one
- Show a subtle "Saved" confirmation — a small grey checkmark + text that appears for 1.5s then fades out. Never a toast that blocks content.
- If save fails, show "Couldn't save — tap to retry" inline below the field

**P0-5: Step validation**
- Prevent advancing to the next step if required fields on the current step are empty
- Required fields: Step 1 — full name, email. Step 2 — at least one job title and employer. Steps 3, 4 — no required fields (can skip). Step 5 — no required fields.
- Show inline error message directly below the failing field, not a generic alert
- Error message text: "[Field name] is required to continue"

**P0-6: Resume from last position**
- When a returning user opens `/builder`, detect that saved data exists and restore the last active step
- Show a banner at the top of step 1: "Welcome back — you left off at [step name]. [Continue →]" (link jumps to that step)
- Banner is dismissible with an ✕

### P1 — ship in same PR if time allows

**P1-1: Step completion checkmarks**
- Once a step is completed and the user advances, the step dot shows a ✓ icon inside it
- This persists even if the user navigates back to the step

**P1-2: Keyboard navigation**
- Tab order within each step follows the DOM order
- Enter key on a field does not advance the step (prevents accidental submissions)
- Enter on the Continue button does advance

**P1-3: Skip button on optional steps**
- Steps 3 and 4 show a "Skip for now" text link above the Continue button
- Skipping is equivalent to completing the step with empty values — the step dot fills

### P2 — log as follow-up issues, do not build now

- Animated progress percentage alongside step dots
- Step time estimates ("~2 min")
- Drag-to-reorder within the work experience step

---

## Acceptance criteria

Claude Code must verify all of the following before marking this spec complete. Output the result of each check as a pass/fail list.

- [ ] **AC-1:** Navigating to `/builder` on a 375px viewport shows only the fields for step 1. No other step fields are in the DOM.
- [ ] **AC-2:** The progress bar is visible at the top of the screen. It shows "Step 1 of 5" and 5 indicators.
- [ ] **AC-3:** Attempting to advance from step 1 with no name entered shows an inline error "Full name is required to continue" below the name field.
- [ ] **AC-4:** Entering a name and email, then tapping "Continue →", transitions to step 2. The step 1 dot fills.
- [ ] **AC-5:** Blurring out of the name field triggers a save. The "Saved" indicator appears and fades within 1.5s.
- [ ] **AC-6:** On a 640px+ viewport, the CTA is inline (not fixed to bottom).
- [ ] **AC-7:** Refreshing the browser after completing step 1 and advancing to step 2 restores step 2 with the data from step 1 intact.
- [ ] **AC-8:** Tapping the back arrow from step 3 returns to step 2 without clearing step 3's data.

---

## Technical notes

- The slide transition should be a CSS `transform: translateX()` transition, not a JS animation library. Keep the bundle lean — this is a Cloudflare Workers deployment.
- Auto-save debounce is not needed on `blur` events — `blur` fires once when the user leaves the field, not continuously.
- If the existing persistence layer is localStorage, use a namespaced key: `gethired:cv:draft`. If it is Cloudflare KV or Supabase, use the existing write function.
- Do not use `useEffect` with an empty dependency array for step restoration — derive the initial step from the stored draft synchronously on component mount.
