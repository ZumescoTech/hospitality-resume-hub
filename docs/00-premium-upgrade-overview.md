# GetHired — Premium Upgrade: Master Overview

> This document is the index for the full premium upgrade spec set. Read this first before giving any individual spec to Claude Code. It establishes the build order, shared stack assumptions, and the decision authority for any open questions Claude Code surfaces.

---

## What we are building

A mobile-first premium upgrade of the GetHired CV builder covering three phases:

| Phase | Spec file | What it builds |
|---|---|---|
| 1A | `01-step-wizard.md` | Replace the current single-form builder with a 5-step mobile wizard |
| 1B | `02-ai-chips.md` | Surface the existing AI phrasing engine as visible tap-to-insert chips |
| 1C | `03-mobile-preview.md` | Collapsible mobile preview modal with in-modal template switcher |
| 2A | `04-premium-templates.md` | 5 new named premium CV templates (Noir, Executive, Harbour, Admiral, Steward) |
| 2B | `05-template-sections.md` | Hospitality-specific CV sections: photo, STCW certifications, languages |
| 3A | `06-ats-score-ring.md` | Animated circular ATS score ring with 3 fix suggestions |
| 3B | `07-premium-gate.md` | Free tier watermark, download gate, WhatsApp share, premium conversion screen |

**Build phases must be done in order.** Phase 1 (builder UX) must be stable before Phase 2 (templates), and Phase 2 before Phase 3 (premium gate). Within a phase, specs labeled A → B → C must also run in order.

---

## Build order rationale

- **Phase 1 first** because premium templates displayed inside a broken mobile UX won't convert users. Fix the container before the content.
- **1A before 1B** because the step wizard restructures the form; AI chips attach to the experience textarea that 1A creates.
- **1B before 1C** because the preview modal (1C) needs to show the complete builder state including AI chip insertions.
- **Phase 2 after Phase 1** so that template switching is tested inside the new wizard/preview architecture, not the old layout.
- **Phase 3 last** because the download gate wraps the finished product — gating a half-built experience creates churn, not revenue.

---

## Stack (validate against codebase before each build)

| Assumption | Expected value | How to verify |
|---|---|---|
| Runtime | Cloudflare Workers | `wrangler.toml` |
| Framework | React (likely Vite or Next.js on Workers) | `package.json` |
| Styling | Tailwind CSS | `tailwind.config.*` |
| Template switcher | `#swatch-{name}` button pattern, 13 existing swatches | DOM inspection or component search |
| Preview container | `.print-area.bg-white.shadow-elegant` | DOM inspection |
| Download | `<a [download]>` anchor | DOM inspection |
| Active swatch | `border-primary` class (not `border-primary/40`) | Existing Playwright test knowledge |
| AI phrasing engine | Existing — role-family slug detection, 6 role families | `@docs/01-ai-phrasing-engine.md` |
| Photo upload | Existing upload step with PIL/Pillow cropping | Component search for photo upload |
| Data persistence | Existing — confirm whether localStorage, KV, or Supabase | Search for storage calls |

> **Rule:** Claude Code must run an investigation phase and confirm each assumption before writing any new code. If an assumption is wrong, Claude Code must surface the discrepancy and wait for a decision before proceeding.

---

## Shared design tokens

These apply to all new UI built in this upgrade. Do not deviate from them.

```
Primary purple:    #7c3aed
Mid purple:        #a78bfa
Purple tint:       #ede9fe  (backgrounds, chip fills)
Deep navy:         #1e293b  (headings)
Darkest navy:      #0f172a  (dark template backgrounds)
Slate grey:        #94a3b8  (body text, secondary)
Border:            use Tailwind's border-border (inherits from existing system)

Minimum touch target: 44px × 44px on all interactive elements
Font stack:        inherit from existing Tailwind config — do not introduce new fonts
```

---

## Decision authority

Any open question Claude Code surfaces must be answered before code is written. This document is not the place for those answers — Claude Code should pause and ask via a numbered list. Tino will answer each one before the build continues.

**Default decisions (apply without asking):**
- Mobile breakpoint: 640px (Tailwind `sm:`)
- Step wizard: 5 steps (Personal → Experience → Skills → Certifications → Preview)
- Auto-save: on every field `blur` event, to existing persistence layer
- Thumb-zone CTA: fixed bottom bar on mobile only (`sm:static`)
- AI chip count per field: max 3 suggestions shown at once
- Template swatch pattern: extend existing `#swatch-{name}` pattern for new templates

---

## How to use these specs with Claude Code

1. Open a new Claude Code session in the GetHired repo root.
2. Paste the contents of `00-premium-upgrade-overview.md` as the first message.
3. Then paste the relevant phase spec (e.g. `01-step-wizard.md`).
4. Claude Code will run its investigation phase first, then build.
5. After each spec is complete, run the relevant acceptance criteria checks before moving to the next spec.
6. Do not combine multiple specs in a single Claude Code session — one spec per session.
