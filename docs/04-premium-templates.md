# GetHired — Spec 04: Premium CV Templates

> **Phase 2A** · Requires all Phase 1 specs (01, 02, 03) to be complete first.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> Existing template swatch pattern: `#swatch-{name}`. New templates must follow this exact pattern and extend the existing swatch row. Do not rename or remove existing templates.

---

## Problem statement

The 13 existing templates are interchangeable — they look different visually but carry no narrative, no purpose, and no identity. A user choosing between "Classic" and "Minimal" has no idea which one is better for a senior sommelier role at a luxury cruise line versus an entry-level waiter application.

Five new premium templates are needed, each with a distinct design identity and a stated purpose within the hospitality hiring context.

---

## Goals

- Add 5 new premium templates with distinct visual identities
- Each template has a name, a purpose statement, and a visual personality
- All 5 render correctly as A4 PDF output without content breaking across page breaks
- Photo placeholder, STCW certifications section, and language proficiency row must be present in every premium template (those sections are spec 05 — wire them up but they may render empty until 05 is complete)
- Extend the existing swatch mechanism — do not rewrite it

## Non-goals

- Do not modify existing templates
- Do not build the STCW section data model in this spec — that is spec 05; just reserve the layout space
- Do not build the premium gate or paywall in this spec — all templates are accessible for now
- Do not introduce new font families

---

## Investigation phase (run before writing any code)

1. How are existing templates structured — are they React components, HTML strings, JSON configs, or CSS class sets? Provide the file path for one existing template (e.g. Noir) as an example.
2. How does the PDF generation work — is it Puppeteer, a `@react-pdf/renderer` library, browser `window.print()`, or a Cloudflare Worker with a headless browser? This determines what CSS is available.
3. Are template swatches generated dynamically from a config array, or are they hardcoded individually?
4. What is the A4 size used in the existing PDF output — is it set in mm, px, or via a CSS `@page` rule?
5. Does any existing template use a two-column layout? If yes, provide its name and file path.

Return answers as a numbered list before writing any code.

---

## The 5 premium templates

### Template 1: Noir
- **Purpose:** Senior roles at luxury cruise lines (Cunard, Silversea, Regent Seven Seas)
- **Personality:** Dark, authoritative, refined
- **Layout:** Single column
- **Design spec:**
  - Background: `#0f172a` (darkest navy)
  - Header area: candidate name in 28px white, headline in 14px `#a78bfa`
  - Section dividers: `1px solid #334155`
  - Body text: `#94a3b8` (slate grey)
  - Accent / section headings: `#7c3aed`
  - Photo placeholder: circular, 72px diameter, top-right of header
  - A4 safe: all text minimum 10pt, line-height 1.5

### Template 2: Executive
- **Purpose:** Managerial and F&B supervisory roles (F&B Director, Restaurant Manager)
- **Personality:** Corporate, structured, trustworthy
- **Layout:** Single column with a left accent stripe
- **Design spec:**
  - Background: white
  - Left border accent: `3px solid #7c3aed` on section headings (using left border, not a sidebar)
  - Candidate name: 26px `#1e293b`, bold
  - Headline: 13px `#94a3b8`, italic
  - Section headings: 11px uppercase, `#7c3aed`, letter-spacing 0.1em
  - Body text: 10pt `#1e293b`
  - Photo placeholder: rectangular, 60×75px, top-right corner of header block

### Template 3: Harbour
- **Purpose:** Versatile — works for mid-level roles across hotel and cruise (Waiter, Bartender, Receptionist)
- **Personality:** Clean, modern, approachable
- **Layout:** Two-column (35% sidebar left, 65% main right)
- **Design spec:**
  - Sidebar background: `#7c3aed`
  - Sidebar text: white for headings, `#ede9fe` for body
  - Main column background: white
  - Candidate name: 22px white, in sidebar header
  - Photo placeholder: circular, 68px, top of sidebar above name
  - Main column headings: 11px uppercase `#7c3aed`, 0.08em letter-spacing
  - Main column body: 10pt `#1e293b`

### Template 4: Admiral
- **Purpose:** Senior F&B and sommelier roles — roles requiring professional credibility
- **Personality:** Centred, formal, signature-worthy
- **Layout:** Single column, centred header
- **Design spec:**
  - Background: white
  - Candidate name: 28px `#1e293b`, centred, small-caps
  - Headline: 12px `#94a3b8`, centred
  - Contact row: icon + text, horizontally distributed, centred, 10px
  - Section dividers: double line (`3px solid #7c3aed` top, `1px solid #e2e8f0` 3px below it)
  - Photo placeholder: circular, 64px, centred above name
  - Body: 10pt `#1e293b`

### Template 5: Steward
- **Purpose:** Entry-level and first-contract applicants
- **Personality:** Fresh, energetic, clear
- **Layout:** Single column with a full-width purple header band
- **Design spec:**
  - Header band: `background: #7c3aed`, full width, padding 24px
  - Candidate name: 24px white
  - Headline: 12px `#ede9fe`
  - Below header: white background
  - Section headings: 11px `#7c3aed`, uppercase, 0.08em letter-spacing
  - Body: 10pt `#1e293b`
  - Photo placeholder: circular, 60px, in header band (right side)

---

## Requirements

### P0 — must ship

**P0-1: Implement all 5 templates**
- Each template is implemented following the design spec above
- Each template extends the existing template architecture (however templates are currently structured — see investigation phase)
- Each template registers a swatch with `id="swatch-noir"`, `id="swatch-executive"`, `id="swatch-harbour"`, `id="swatch-admiral"`, `id="swatch-steward"`

**P0-2: Swatch thumbnails**
- The swatch thumbnail for each template reflects its actual colour palette (not a generic grey box)
- Below each swatch thumbnail: the template name + a purpose tag in 10px text
- Example: "Harbour · Mid-level roles"
- Premium badge: a small `PREMIUM` label overlaid on each new swatch (gold `#92400e` on `#fef3c7` — this is visual only; the paywall is spec 07)

**P0-3: A4 print safety**
- All 5 templates must render correctly within an A4 page (210mm × 297mm)
- No section heading should appear as the last element on a page with its content on the next page (`page-break-after: avoid` on headings)
- Minimum font size: 10pt (approximately 13.3px)
- Test with a fully populated CV (3 work experience entries, 8 skills, 3 certifications)

**P0-4: Photo placeholder**
- Every premium template includes a photo placeholder in the position specified in the design spec
- If no photo is provided by the user, the placeholder renders as a light grey circle/rectangle with a person icon (`ti-user`)
- If a photo is provided (existing photo upload from `@docs/02-photo-compliance-check.md`), it renders in the placeholder at correct aspect ratio, cropped to the shape

**P0-5: Section placeholder for STCW and languages**
- Reserve layout space in each template for:
  - A "Certifications" section (will be populated by spec 05)
  - A "Languages" row (will be populated by spec 05)
- These can render empty (no placeholder text, just the section heading) until spec 05 is complete

### P1 — ship in same PR if time allows

**P1-1: Swatch group label**
- In the swatch row, group existing templates under a "Classic" label and new templates under a "Premium" label, with a visual divider between groups

### P2 — log as follow-up, do not build now

- Cover letter template variants matching each premium template
- Dark/light mode toggle per template

---

## Acceptance criteria

- [ ] **AC-1:** All 5 swatches appear in the swatch row with correct IDs (`#swatch-noir`, `#swatch-executive`, `#swatch-harbour`, `#swatch-admiral`, `#swatch-steward`).
- [ ] **AC-2:** Tapping each swatch updates the preview to show the corresponding template design. Each template is visually distinct from the others.
- [ ] **AC-3:** The Harbour template renders a two-column layout. The Noir template renders a dark background. Verify visually.
- [ ] **AC-4:** A fully populated CV (3 roles, 8 skills, 3 certs) renders without any content overflowing the A4 boundary across all 5 templates.
- [ ] **AC-5:** A photo-less CV shows the person icon placeholder in the correct position for each template.
- [ ] **AC-6:** Uploading a photo (existing flow) replaces the placeholder in the preview for all 5 templates.
- [ ] **AC-7:** Each swatch shows a PREMIUM badge.
- [ ] **AC-8:** The Certifications and Languages section headings are visible in the preview for all 5 templates even when no data has been entered yet.

---

## Technical notes

- If templates are CSS-class-based, each premium template should be its own CSS class set (e.g. `.template-noir`, `.template-executive`) — do not use inline styles for the template design, as inline styles override PDF rendering in some environments.
- If templates are React components, each premium template should be a separate component in a `templates/premium/` directory.
- The circular photo crop should use `border-radius: 50%` and `object-fit: cover` — do not use canvas or server-side image processing in this spec.
- Two-column layouts in PDF must use CSS columns or a table layout, not Flexbox — Flexbox rendering in headless PDF generators can be unreliable. Check the existing multi-column template (if any) for the pattern in use.
