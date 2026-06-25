# GetHired — Spec 07: Premium Gate & Download Conversion

> **Phase 3B** · The final spec in the premium upgrade set. Requires all previous specs (01–06) to be complete.
> Stack assumptions and shared tokens: `00-premium-upgrade-overview.md`.
> This spec wraps the completed product in a monetisation layer. It must not be built before the product itself is ready — gating a half-built experience creates churn, not revenue.

---

## Problem statement

Right now GetHired has no revenue mechanism. There is no way to upgrade, no distinction between free and premium, and no moment of conversion. All features — including the premium templates — are freely accessible.

The premium gate converts the completed product into a freemium SaaS. Free users get real value (watermarked PDF + WhatsApp share) while premium users get the full product (clean PDF, DOCX, shareable link, all premium templates).

The goal is a gate that feels fair — not a dark pattern like Zety's hidden paywall — and converts at the moment of highest intent: download.

---

## Goals

- Create a clear free vs. premium tier distinction
- Show the conversion offer at the moment of highest user intent (download attempt)
- Give free users genuine value so the product is still shareable and useful at no cost
- Make WhatsApp share a first-class mobile action (free tier) — this is the viral loop
- Premium gate is enforced client-side for now with server-side enforcement as P1

## Non-goals

- Do not build a payment processor integration in this spec — the upgrade CTA links to an external checkout URL (Stripe, Lemon Squeezy, or Gumroad — to be confirmed by Tino before build)
- Do not build user accounts or login in this spec — premium state is stored in localStorage as a signed token until server-side enforcement is added
- Do not remove free tier access to the 5-step wizard, AI chips, or ATS score ring — those features are free
- Do not gate the existing classic templates (non-premium) — only the 5 new premium templates from spec 04 are gated

---

## Investigation phase (run before writing any code)

1. Is there any existing authentication, session, or user state system in the codebase? If yes, describe it and provide file paths.
2. Is there an existing download flow — where does tapping "Download CV" currently trigger the PDF generation and download?
3. Is there any existing pricing page or upgrade CTA anywhere in the app?
4. What environment variables are available for runtime config (e.g. a checkout URL or feature flags)?
5. Is the PDF generated client-side or server-side (Cloudflare Worker)? This determines where the watermark is applied.

> **Before building anything**: Tino must confirm the checkout URL to use for the upgrade CTA. This URL is required before P0-4 can be implemented. Pause at this step and ask.

---

## Free vs. premium tier definition

| Feature | Free | Premium |
|---|---|---|
| 5-step wizard | ✓ | ✓ |
| AI phrasing chips | ✓ | ✓ |
| ATS score ring | ✓ | ✓ |
| Classic templates (existing 13) | ✓ | ✓ |
| Premium templates (Noir, Executive, Harbour, Admiral, Steward) | Preview only (watermarked download) | ✓ Full access |
| PDF download | Watermarked | Clean |
| DOCX download | ✗ | ✓ |
| Shareable CV link | ✗ | ✓ |
| WhatsApp share | Watermarked preview image | Clean PDF share |
| Remove PREMIUM badge from swatch | ✗ | ✓ |

---

## Requirements

### P0 — must ship

**P0-1: Premium state management**
- Premium state is a boolean stored in localStorage under the key `gethired:premium:v1`
- Value is a JSON object: `{ active: true, activatedAt: ISO8601, token: "..." }`
- The token is a simple HMAC or base64 string — enough to prevent casual tampering, not a full auth system
- A hook `usePremium()` returns `{ isPremium: boolean, activate: (token) => void }` for use across components
- On app load, validate the token format — if invalid or missing, `isPremium` is `false`

**P0-2: Watermarked PDF (free tier)**
- When a free user downloads a CV using a premium template, the PDF has a watermark
- Watermark: diagonal text "GetHired Free" repeated across the page in `#94a3b8` at 20% opacity, 18px, rotated -45°
- If the user is using a classic (non-premium) template, no watermark is applied
- The watermark must be applied at PDF generation time — not as a CSS overlay on the preview

**P0-3: Download gate modal**
- When a free user taps "Download CV" on step 5 (or on the preview modal download button):
  - If they are using a classic template: download proceeds normally (no gate)
  - If they are using a premium template: show the download gate modal before generating the PDF
- The gate modal is not a hard block — it shows the upgrade offer but also has a "Download free version (with watermark)" secondary action
- Modal contents:
  - Heading: "Unlock your premium CV"
  - Body: "Download a clean, watermark-free PDF and unlock all premium templates."
  - Price: "R49 / month" (or equivalent — Tino to confirm currency and price before build)
  - Primary CTA button: "Upgrade to Premium →" (links to checkout URL)
  - Secondary action text link: "Download with watermark instead"
  - Close icon (✕) in top-right — closing the modal without choosing returns the user to the builder
- Modal is a bottom sheet on mobile (slides up from bottom), a centred dialog on desktop

**P0-4: WhatsApp share (free tier)**
- On step 5 (preview & download), below the Download button, add a "Share on WhatsApp" button
- Button appearance: `background: #25D366` (WhatsApp green), white icon + text, `border-radius: 8px`
- Behaviour:
  - Generate a preview image of the CV (first page only) — PNG, max 800px wide
  - Open `https://wa.me/?text=` with a pre-filled message: "Here's my CV built with GetHired 👋 [preview image URL or download link]"
  - If a shareable link is not available (free user, no server-side hosting), use the message: "I built my CV with GetHired — check it out at [app URL]"
- WhatsApp share is available on free tier — this is the viral loop
- On desktop: show the WhatsApp web URL. On mobile: open the WhatsApp app via deep link (`whatsapp://send?text=...`)

**P0-5: Premium template visual state**
- Premium template swatches show a `PREMIUM` badge (already built in spec 04)
- When a free user selects a premium template swatch, allow the preview to show the template (no preview gate)
- The gate only activates at the download step, not at selection
- After upgrade: remove the PREMIUM badge from swatches, remove the gate from the download flow

**P0-6: Post-upgrade confirmation**
- After the user returns from the checkout URL (redirect back to the app), detect the successful upgrade
- Detection: a URL query param `?upgraded=1` or the checkout provider's redirect mechanism — confirm with Tino before building
- On detection: set `isPremium: true` in localStorage, show a one-time confirmation banner: "Welcome to Premium — your watermark-free CVs are ready to download. 🎉"
- Banner auto-dismisses after 5 seconds

### P1 — ship in same PR if time allows

**P1-1: DOCX download (premium)**
- Premium users see a "Download as Word (.docx)" option alongside the PDF download
- DOCX generation: use the existing CV data model to populate a simple DOCX template using a library appropriate to the runtime (confirm in investigation phase)
- The DOCX does not need to replicate the premium template design exactly — a clean, correctly structured plain DOCX is sufficient

**P1-2: Shareable CV link (premium)**
- Premium users can generate a public URL for their CV: `https://gethired.app/cv/[slug]`
- The slug is a random 8-character alphanumeric string
- The CV data is stored at this URL (in Cloudflare KV or equivalent) and renders the CV in the browser without requiring the builder
- This is a read-only view — no editing at the shared URL

### P2 — log as follow-up, do not build now

- Server-side premium validation (replace localStorage token with a proper JWT/session)
- Annual plan pricing
- Team/agency plan (multiple CVs under one account)

---

## Acceptance criteria

- [ ] **AC-1:** On a fresh browser session, `usePremium()` returns `{ isPremium: false }`.
- [ ] **AC-2:** A free user selecting a premium template (e.g. Noir) sees the full preview without any gate or overlay.
- [ ] **AC-3:** A free user on step 5 tapping "Download CV" with a premium template selected sees the gate modal. The modal shows the upgrade CTA and the watermark download secondary action.
- [ ] **AC-4:** Tapping "Download with watermark instead" downloads a PDF with the "GetHired Free" watermark visible on the page.
- [ ] **AC-5:** A free user on step 5 selecting a classic template and tapping "Download CV" downloads a clean PDF with no modal and no watermark.
- [ ] **AC-6:** The "Share on WhatsApp" button is visible on step 5. On a mobile device, tapping it opens WhatsApp with the pre-filled message.
- [ ] **AC-7:** Navigating to `/?upgraded=1` (or the confirmed checkout redirect URL) sets `isPremium: true` and shows the confirmation banner.
- [ ] **AC-8:** After upgrade, a premium template download produces a clean PDF with no watermark and no gate modal.
- [ ] **AC-9:** After upgrade, the PREMIUM badge is no longer visible on premium template swatches.
- [ ] **AC-10:** The gate modal is a bottom sheet on a 375px viewport and a centred dialog on a 1024px viewport.

---

## Technical notes

- The watermark is best applied server-side (in the Cloudflare Worker that generates the PDF) to prevent users from inspecting the client-side code and bypassing it. If PDF generation is client-side, apply the watermark as an SVG overlay rendered into the PDF canvas before export.
- The localStorage premium token should include a checksum so that `{ active: true, activatedAt: ..., token: "abc" }` cannot be manually crafted. A simple approach: `token = btoa(activatedAt + ':' + SECRET_SALT)` where `SECRET_SALT` is a build-time environment variable. This is security theatre for solo-founder stage — replace with server-side validation when revenue justifies it.
- `whatsapp://` deep links open the WhatsApp app on mobile without requiring the user to select a contact. The `?text=` parameter pre-fills the message composer. Test on both iOS and Android — iOS requires `whatsapp://send?text=...`, Android accepts both `whatsapp://` and `https://wa.me/`.
- Do not use `window.location.href` for the WhatsApp share — use `window.open(url, '_blank')` so the user can return to the builder without a full page reload.
