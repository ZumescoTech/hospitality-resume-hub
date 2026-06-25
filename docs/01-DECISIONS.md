# Spec 01 — Investigation Decisions

All three discrepancies are resolved. Proceed to implementation.

---

## Decision 1 — Steps: use 6, not 5

Keep all 6 existing section components exactly as they are. The wizard order is:

1. Personal info (`PersonalSection`) — required: full name, email
2. Work experience (`ExperienceSection`) — required: 1 job title + employer
3. Education (`EducationSection`) — skippable
4. Skills (`SkillsSection`) — skippable
5. Certifications & Languages (`CertificationsSection`) — skippable
6. Hospitality details (`HospitalitySection`) — skippable, last step

There is no standalone Preview step. On step 6, the "Continue →" button becomes "Preview CV →". On desktop it scrolls to `PreviewPanel`. On mobile it opens the preview modal (that is spec 03 — for now, just change the button label on step 6 and leave the action as a no-op or console.log placeholder).

Update all references in the spec from "Step N of 5" to "Step N of 6". Update `StepProgress` to show 6 indicators.

---

## Decision 2 — localStorage key: keep `hospitality-resume-v1`

Do not change the key. Any reference in the spec to `gethired:cv:draft` is wrong — ignore it. Store `_lastStep` as an additional field inside the existing `hospitality-resume-v1` object. Strip it before any Supabase write or PDF generation.

---

## Decision 3 — Save indicator: cosmetic layer only

Do not touch `useResumeStore`. Do not add `onBlur` callbacks. Do not refactor the auto-save timing.

The indicator works like this:
- `useResumeStore` already exposes save state (the "Saving…" / "Saved" badge currently in the form header).
- Read that same state. When it transitions from "saving" to "saved", show the compact "✓ Saved" indicator for 1.5s then fade it out.
- This is a display-only change. The save itself is unchanged.

---

## What to build now

Read the updated spec at `@docs/01-step-wizard.md` — it has been updated to reflect these decisions. The investigation phase section at the top of the spec now documents these resolutions.

Build the following in order:

1. Extend `StepProgress.tsx` — "Step N of 6" label, fixed positioning on mobile, pulse on active pill
2. Update `BuilderPage` (`src/routes/builder.tsx`) — conditional render: on mobile, render only the active `*Section`; on `lg:`, keep the existing accordion map unchanged
3. Add the slide transition CSS to the section wrapper
4. Add the bottom CTA bar component (mobile only) — back arrow, Continue/Preview CV button
5. Add step validation on "Continue →" tap — pass `showErrors` prop to `PersonalSection` and `ExperienceSection` only
6. Add resume-from-last-step logic — read `_lastStep` from stored data on mount, show the welcome-back banner
7. Add the "✓ Saved" compact indicator — subscribe to existing store save state

Run AC checks against each item as you complete it. Output a pass/fail list for all 9 ACs before declaring the spec done.
