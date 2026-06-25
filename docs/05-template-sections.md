# GetHired — Spec 05: Hospitality-Specific CV Sections

> **Phase 2B** · Requires spec 04 (premium templates) to be complete first.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> This spec adds three new data sections to the CV data model and builder: photo (upgrade from upload-only to upload+position), STCW certifications, and language proficiency. These are the sections that no general-purpose CV builder offers, and they are mandatory for cruise line applications.

---

## Problem statement

Cruise line recruiters assess CVs against three criteria that generic CV builders ignore entirely:

1. **Photo** — most cruise lines require a professional headshot on the CV. The existing photo upload step exists but is not standardised or guided.
2. **STCW certifications** — Standards of Training, Certification and Watchkeeping certificates are mandatory for working aboard any commercial vessel. Without them, a CV is disqualified regardless of experience.
3. **Language proficiency** — cruise lines require English fluency and note any additional languages; a language row is a standard CV component for maritime roles.

These are not nice-to-haves. They are the difference between a CV that gets read and one that gets binned.

---

## Goals

- Add STCW certifications as a proper CV section with structured fields
- Add language proficiency rows with standardised level labels
- Upgrade the photo upload step to include professional guidelines and compliance cues
- All three sections integrate into the builder wizard (step 4 — Certifications) and render in all 5 premium templates

## Non-goals

- Do not validate STCW certificate numbers or expiry dates against any external database
- Do not add video or document upload for certificates — text entry only in this spec
- Do not add language testing or proficiency assessment
- Do not modify steps 1–3 of the wizard

---

## Investigation phase (run before writing any code)

1. Does the existing CV data model have any field for certifications or languages? If yes, provide the field names and where they are stored.
2. Does the existing photo upload store the photo as a URL (cloud storage), a base64 string, or a File object in memory?
3. Is there a step 4 (Certifications) in the wizard from spec 01, or was it left as a placeholder? What fields, if any, does it currently contain?
4. Are there any existing form input components for structured list items (e.g. an "Add another" repeating field pattern)? If yes, provide the file path — reuse before creating new.
5. Does the photo compliance checker from `@docs/02-photo-compliance-check.md` run on the existing upload? If so, what does it check and what does it return?

Return answers as a numbered list before writing any code.

---

## Section 1: Photo upgrade

### Current state
An existing upload step accepts a photo and crops it. The compliance checker from `@docs/02-photo-compliance-check.md` may or may not be wired in.

### P0 requirements

**P0-1: Photo guidelines panel**
- Below the photo upload input, add a collapsible "Photo tips for cruise line applications" panel
- Default state: expanded on first visit, collapsed thereafter (persist collapse state in localStorage)
- Panel content (render exactly as written):
  - ✓ Professional attire — uniform or smart formal dress
  - ✓ Plain light background — white or pale grey
  - ✓ Head and shoulders only — centred in frame
  - ✓ Clear, well-lit — no shadows across the face
  - ✗ No selfies or casual photos
  - ✗ No sunglasses
- Panel style: `background: #f0fdf4`, `border: 1px solid #86efac`, `border-radius: 8px`, `padding: 12px 16px`, `font-size: 13px`

**P0-2: Photo position selector**
- After a photo is uploaded, show 3 position options: "Top left", "Top right", "Centred above name"
- Default: "Top right" (most common for European/African cruise line CVs)
- The selected position is stored in the CV data model and passed to the template renderer
- Templates must respect this position setting when rendering the photo placeholder

**P0-3: Compliance feedback (if checker is wired)**
- If the photo compliance checker (`@docs/02-photo-compliance-check.md`) is active, display its output below the uploaded photo
- Pass state: green tick icon + "Photo looks good"
- Fail state: amber warning icon + the specific failure reason (e.g. "Background appears dark — try a lighter background")
- Do not block the user from proceeding if the photo fails — it is advisory only

---

## Section 2: STCW Certifications

### Background
STCW (Standards of Training, Certification and Watchkeeping for Seafarers) is the international standard for maritime crew training. Common certificates relevant to hospitality crew:
- STCW Basic Safety Training (BST) — mandatory for all crew
- Crowd Management — required for passenger vessel crew
- Crisis Management and Human Behaviour — for supervisory roles
- Security Awareness — required for all crew since 2012
- Food Safety (HACCP) — for F&B crew

### P0 requirements

**P0-1: STCW certifications section in step 4**
- Section heading: "Certificates & Training" with a ⚓ icon
- Introductory text (12px, grey): "STCW certificates are required by all cruise lines. Add any you hold."
- An "Add certificate" button that adds a repeating certificate entry row

**P0-2: Certificate entry row fields**
- Each row contains:
  - Certificate name (text input, with a pre-populated dropdown of common certificates — see list below)
  - Issuing body (text input, placeholder: "e.g. SAMSA, MCA, STCW Centre")
  - Expiry date (month + year selectors, optional — some certificates do not expire)
  - A trash icon to remove the row
- Pre-populated dropdown options for certificate name:
  - STCW Basic Safety Training (BST)
  - Crowd Management
  - Crisis Management and Human Behaviour
  - Security Awareness
  - Food Safety / HACCP
  - Proficiency in Survival Craft
  - Medical First Aid
  - [Other — type your own]
- Maximum 8 certificate rows

**P0-3: Certificate rendering in templates**
- All 5 premium templates must render the certificates section
- Render as a two-column grid: certificate name left, expiry right (or "No expiry" if not set)
- If no certificates are entered, the section heading is still visible but the section body is empty

---

## Section 3: Language Proficiency

### P0 requirements

**P0-1: Languages section in step 4**
- Below the STCW section
- Section heading: "Languages"
- An "Add language" button that adds a repeating language row

**P0-2: Language row fields**
- Each row contains:
  - Language name (text input with a datalist of 30 common languages as suggestions — not a locked dropdown)
  - Proficiency level (select with exactly these options, in this order):
    - Native
    - Fluent
    - Conversational
    - Basic
  - A trash icon to remove the row
- Maximum 6 language rows
- Default: one row pre-populated with "English" at "Fluent" level (user can change)

**P0-3: Language rendering in templates**
- All 5 premium templates render languages as a horizontal row of `[Language] · [Level]` items
- Separator between items: ` · ` (middle dot with spaces)
- If only one language is entered, render it alone without a separator
- If no languages are entered, the Languages row is hidden entirely (not an empty section)

---

## Acceptance criteria

- [ ] **AC-1:** The photo guidelines panel is visible below the photo upload on first visit. After collapsing and refreshing, it remains collapsed.
- [ ] **AC-2:** After uploading a photo, three position options are shown. Selecting "Top left" moves the photo to the top-left in the preview.
- [ ] **AC-3:** If the compliance checker is active, a pass/fail indicator appears below the uploaded photo.
- [ ] **AC-4:** Step 4 of the wizard shows an "Add certificate" button. Tapping it adds a certificate row with the name dropdown, issuing body input, and expiry selectors.
- [ ] **AC-5:** Selecting "STCW Basic Safety Training (BST)" from the dropdown populates the certificate name field. Selecting "[Other — type your own]" clears the field and allows free text entry.
- [ ] **AC-6:** Added certificates appear in the CV preview for all 5 premium templates.
- [ ] **AC-7:** Step 4 shows an "Add language" button. Tapping it adds a language row with name input and proficiency select.
- [ ] **AC-8:** The default row shows "English · Fluent" in the preview. Adding "French · Conversational" shows "English · Fluent · French · Conversational".
- [ ] **AC-9:** Removing all language rows hides the Languages section entirely from the preview.
- [ ] **AC-10:** A fully populated step 4 (3 certificates, 2 languages) persists correctly after navigating away and returning.

---

## Technical notes

- The certificate name "dropdown" should be a `<datalist>` linked to the text input, not a `<select>` — this allows both selection from the list and free-text entry without the "[Other]" workaround, which is simpler. Reconsider if the investigation phase reveals a specific reason to use `<select>`.
- Expiry date: use two separate `<select>` elements (month dropdown, year dropdown). Year range: current year to current year + 10. Do not use a date picker — date pickers on mobile are unpredictable across devices.
- The language datalist should include at minimum: English, French, Spanish, Portuguese, Italian, German, Dutch, Mandarin, Japanese, Arabic, Swahili, Zulu, Xhosa, Afrikaans, Hindi, Tagalog (Tagalog is the most common first language among cruise crew).
- Do not store certificate entries or language rows as a serialised string — store as a proper array of objects in the CV data model.
