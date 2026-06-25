# GetHired — Spec 01: Mobile Step Wizard

> **Phase 1A** · Must be completed before specs 1B and 1C.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> Self-contained for build purposes — only assumptions relevant to this spec are repeated below.

---

## Investigation phase — resolved decisions

The investigation phase is complete. Claude Code surfaced three discrepancies. All three are resolved below. Do not re-run the investigation phase — proceed directly to implementation.

**Discrepancy 1 resolved — Step count is 6, not 5**

The codebase has 6 existing section components: Personal, Experience, Education, Skills, Certifications, Hospitality. Keep all 6. The spec's original 5-step table is superseded by the corrected 6-step table below. There is no standalone Preview step — the preview lives in PreviewPanel (desktop) and the mobile modal (spec 03).

**Discrepancy 2 resolved — localStorage key**

Keep the existing key `hospitality-resume-v1` (defined as `STORAGE_KEY` in `src/types/resume.ts`). Do not change it. Any reference in this spec to `gethired:cv:draft` is incorrect — ignore it.

**Discrepancy 3 resolved — Save indicator is cosmetic only**

Do not refactor the store to blur-triggered saves. The existing continuous auto-save in `useResumeStore` is correct and must not be changed. The "Saved ✓" indicator is a cosmetic UI layer only — listen to the save events the store already fires and display the indicator in response to those. Do not add `onBlur` callbacks to section components.

---

## Problem statement

The current builder renders all 6 section accordions simultaneously in the DOM with only the active one `defaultOpen`. On mobile (375–430px viewport), this means users face a wall of collapsed accordions with no sense of progress, no guided flow, and no clear next action. The existing `StepProgress` component exists but does not enforce a true step-by-step flow.

This spec converts the accordion layout into a genuine mobile wizard: one section visible at a time, true DOM isolation per step, a fixed bottom CTA, and a visible progress bar. Desktop layout is unchanged.

---

## Goals

- On mobile, show only the active step's section component — remove the rest from the DOM
- Make progress visible via the existing `StepProgress` component (extend, do not replace)
- Fix the primary CTA to the bottom of the screen on mobile
- Show a "Saved ✓" indicator that responds to the store's existing auto-save events
- Allow returning users to resume from their last active step

## Non-goals

- Do not change what data is collected — only how it is presented on mobile
- Do not touch PDF generation or download logic
- Do not change the template switcher or PreviewPanel — those are specs 03 and 04
- Do not change the desktop layout — the accordion-per-section layout remains on `lg:` screens
- Do not introduce new dependencies

---

## Confirmed stack facts

- Router: TanStack Router. `/builder` = `src/routes/builder.tsx` (`BuilderPage` component)
- Step state: integer in `BuilderPage`, controls which section accordion is `defaultOpen`
- Persistence: `useResumeStore()` in `src/lib/resume-store.ts`, dual-path (localStorage `hospitality-resume-v1` for anon, Supabase debounced for auth users)
- Existing step components: `StepProgress.tsx`, 6 `*Section.tsx` files
- Mobile tab switcher: `mobileTab` state already exists in `BuilderPage` switching between form and preview columns

---

## The 6 steps

| Step | Label | Component | Required fields to advance |
|---|---|---|---|
| 1 | Personal info | `PersonalSection` | Full name, email |
| 2 | Work experience | `ExperienceSection` | At least 1 job title + employer |
| 3 | Education | `EducationSection` | None (skippable) |
| 4 | Skills | `SkillsSection` | None (skippable) |
| 5 | Certifications & Languages | `CertificationsSection` | None (skippable) |
| 6 | Hospitality details | `HospitalitySection` | None (skippable) |

> Step 6 is the last step. The "Continue →" button on step 6 becomes "Preview CV →" and triggers the mobile preview modal (spec 03) or scrolls to PreviewPanel on desktop.

---

## Requirements

### P0 — must ship

**P0-1: Mobile-only wizard behaviour**

Apply the following only on screens narrower than `lg` breakpoint (1024px). On `lg:` and above, the existing accordion layout is unchanged.

On mobile:
- Only the section component for the current step is rendered in the DOM. The other 5 are not rendered at all — not hidden, not `display:none`, genuinely unmounted.
- Wrap the active section in a transition container. When the step changes, the outgoing section slides out left, the incoming section slides in from right (forward navigation) or vice versa (backward navigation).
- CSS transition only: `transform: translateX()`, 220ms ease-out. No animation library.

**P0-2: Progress bar — extend `StepProgress`**

The existing `StepProgress` component already renders a progress bar and step pills. Extend it (do not replace it) to:
- Show "Step N of 6" as text on the left side of the bar
- On mobile: fix the bar to the top of the viewport (`position: fixed; top: 0; left: 0; right: 0; z-index: 50`). Give the content area `padding-top` equal to the bar height to prevent overlap.
- Completed step pills show a ✓ inside them (already filled purple `#7c3aed`)
- Current step pill pulses (CSS `@keyframes pulse`, `opacity: 1 → 0.6 → 1`, 1.5s infinite)
- Tapping a completed step pill navigates back to that step. Forward navigation only via the bottom CTA.

**P0-3: Bottom CTA bar (mobile only)**

- Render only on screens narrower than `lg` (`lg:hidden` equivalent)
- Fixed to bottom of viewport: `position: fixed; bottom: 0; left: 0; right: 0`
- Background: white with a `border-top: 1px solid` using the existing border token
- Contents: back arrow link (hidden on step 1) on the left, primary button on the right
- Primary button text:
  - Steps 1–5: "Continue →"
  - Step 6: "Preview CV →"
- Primary button: `background: #7c3aed`, white text, `border-radius: 8px`, `min-height: 48px`, `padding: 0 24px`
- Back arrow: a `<button>` with a left arrow icon, `min-height: 48px`, `min-width: 48px` (touch target)
- Give the form content area `padding-bottom` equal to the CTA bar height to prevent content being hidden behind it

**P0-4: Save indicator**

- Listen to the save state that `useResumeStore` already exposes (the existing "Saving…" / "Saved to cloud" / "Auto-saved locally" badge in the form header)
- On mobile, render a compact version of this indicator: a small ✓ icon + "Saved" text in 12px `#94a3b8`, appearing for 1.5s then fading out with a CSS `opacity` transition
- Position: top-right of the form content area, below the fixed progress bar
- Do not add a separate save mechanism — only surface the existing store's save events

**P0-5: Step validation**

- Prevent advancing when required fields are missing (see table above)
- Validation fires on "Continue →" tap — not on field change
- Show inline error directly below the failing field: "[Field name] is required to continue"
- Use the existing field component patterns — do not add a new validation library
- Pass a `showErrors: boolean` prop to the relevant section components, defaulting to `false`. Section components render their own inline errors when `showErrors` is `true` and the field is empty.

**P0-6: Resume from last active step**

- On `/builder` load, read `lastStep` from `useResumeStore` or localStorage
- If `lastStep > 1` and saved data exists, initialise the step state to `lastStep`
- Show a dismissible banner below the progress bar on step 1 (only when returning): "Welcome back — you left off at [step label]. Continue →" (the Continue link jumps to `lastStep`)
- Banner: `background: #ede9fe`, `border-radius: 8px`, `padding: 10px 14px`, 13px text, ✕ dismiss button
- Persist `lastStep` to the same localStorage key (`hospitality-resume-v1`) as part of the existing data object — add a `_lastStep: number` field to the stored object

### P1 — ship in same PR if time allows

**P1-1: Skip button on optional steps**
- Steps 3–6 show a "Skip for now →" text link in the bottom CTA bar, to the left of the primary button and to the right of the back arrow
- Skipping advances to the next step without validation, marks the step dot as complete (hollow with a dash `—` inside, not a ✓, to visually distinguish skipped from completed)

**P1-2: Keyboard navigation**
- `Tab` order within each step follows DOM order
- `Enter` on a field does not advance the step
- `Enter` on the Continue button does advance

### P2 — log as issues, do not build now

- Step time estimates
- Drag-to-reorder within ExperienceSection
- Animated progress percentage

---

## Acceptance criteria

Claude Code must verify all of the following before marking this spec complete.

- [ ] **AC-1:** On a 375px viewport, navigating to `/builder` shows only `PersonalSection` in the DOM. `ExperienceSection`, `EducationSection`, and all others are not present in the DOM at all.
- [ ] **AC-2:** The progress bar shows "Step 1 of 6" and 6 step indicators. It is fixed to the top of the viewport on mobile.
- [ ] **AC-3:** Tapping "Continue →" on step 1 with no name entered shows an inline error below the name field. The user does not advance to step 2.
- [ ] **AC-4:** Entering a valid name and email, then tapping "Continue →", transitions to step 2. The step 1 indicator shows ✓. The slide animation is visible.
- [ ] **AC-5:** The "Saved ✓" indicator appears briefly after the store fires a save event, then fades out. It does not block any content.
- [ ] **AC-6:** On a 1024px+ viewport, all 6 section accordions are rendered in the DOM simultaneously. The bottom CTA bar is not rendered. The existing layout is unchanged.
- [ ] **AC-7:** Refreshing the browser after advancing to step 3 restores step 3 on reload. All previously entered data is intact.
- [ ] **AC-8:** Tapping the back arrow from step 4 returns to step 3 without clearing step 4's data.
- [ ] **AC-9:** The bottom CTA bar does not overlap form content on any step. Content is fully scrollable above the bar.

---

## Technical notes

- Use a CSS `transform: translateX()` slide. Apply a class like `slide-in-right` (incoming) and `slide-out-left` (outgoing) to the section wrapper. Swap classes on step change, clean up after `transitionend`. No library.
- The "only active section in DOM" rule means the `BuilderPage` render switches on the `currentStep` integer and returns a single `<section>` containing only the active `*Section` component. The existing `STEPS.map(...)` accordion render is preserved inside an `lg:block hidden` wrapper — it is still rendered on desktop.
- `_lastStep` is an internal field — strip it before sending CV data to the PDF generator or Supabase `resumes` table.
- The fixed progress bar and fixed bottom CTA bar create a sandwiched scroll area. Set `overflow-y: auto` on the content area, with `padding-top` = bar height and `padding-bottom` = CTA height. Test that the last field on each step is reachable above the CTA.
