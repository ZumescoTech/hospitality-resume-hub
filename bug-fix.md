# bug-fix.md — GetHired QA Remediation

**App:** GetHired (Hospitality / Cruise Ship CV Builder)
**Stack:** React + TanStack Router, deployed on Cloudflare Workers, Supabase (auth + draft storage)
**Prod URL:** https://hospitality-resume-hub.madzunguruset.workers.dev/
**Source of findings:** Live usability + functionality test via Claude Chrome extension, 1 July 2026
**Owner:** Tino Madzunguruse (Zumesco Tech)
**Executor:** Claude Code
**Release gate:** All P0 + P1 green in CI, full suite passing, fresh preview deploy passes manual smoke test of the three core journeys.

---

## 0. How to use this document — loop-engineering + TDD

This is not a checklist to skim. Work it as a **closed agentic loop**, one bug at a time, smallest blast-radius first. Every bug follows the same five beats. Do not advance until the loop closes green.

```
INVESTIGATE  →  WRITE FAILING TEST (red)  →  FIX  →  PROVE (green)  →  REGRESSION SWEEP
```

### Rules of the loop

1. **One bug = one branch = one commit = one loop.** Never batch fixes into a single commit. If a fix touches shared code, say so and re-run the full suite.
2. **No fix without a failing test first.** If you cannot write a test that fails *before* your change, you do not yet understand the bug. Go back to INVESTIGATE.
3. **Investigate before touching code.** Read the actual component, the router config, the CSS. Write your hypothesis in the commit body. Do not pattern-match a fix from the symptom.
4. **The test is the spec.** The acceptance criteria in each bug define the assertions. Translate each into a test, not into a vibe.
5. **Prove it in the environment it broke in.** Several of these are Cloudflare Workers / hydration-specific. A green unit test in isolation is necessary but not sufficient — confirm on `wrangler dev` or a preview deploy.
6. **Close the loop out loud.** End each bug with: the red output, the green output, and one line on regression risk.

### Why loop discipline matters here

These bugs are coupled. If you fix Download (P0-4) before clearing the sample data (P0-3), you will "prove" download works using a fake CV (Thabo Nkosi) and miss that it never wired to real user state. The execution order in §6 exists for this reason. Follow it.

### Tooling assumptions

Confirm against the repo before assuming. Do not introduce a framework the repo doesn't already use.

- **Unit / component:** Vitest + React Testing Library
- **E2E / browser:** Playwright (the repo has Playwright history — reuse it)
- **Per-loop run order:** `vitest run <file>` → `playwright test <spec>` → full `vitest run` sweep
- **Release command:** `test:all` (unit + e2e), wired into CI, blocking merge on failure

---

## 1. Environment setup — do this before any fix

```
INVESTIGATE the repo before writing anything.
```

- [ ] Confirm test runners exist. If Vitest / Playwright are not configured, scaffold them — but check `package.json` first and match what's there.
- [ ] Confirm you can run the app locally against Workers: `wrangler dev` (or the repo's dev script). Note the local URL.
- [ ] Make Playwright target both local and preview via a `BASE_URL` env var.
- [ ] Create `tests/e2e/smoke.spec.ts` as an empty scaffold. You will fill it as you go (final suite in §4).
- [ ] Add a `test:all` script that runs unit + e2e. CI must call it.
- [ ] Read the TanStack Router route tree so you know exactly where routes are declared (needed for P1-1).
- [ ] Grep the codebase for the seed-data tokens now, so you know their blast radius before P0-3: `Thabo`, `Maison Laurent`, `Trattoria`, `thabo.nkosi`, `Plate & Pen`, `gh-reveal`.

---

## 2. Priority ledger

| ID | Severity | Bug | Journey blocked |
|------|----------|-----|-----------------|
| P0-1 | Critical | Landing page reveal animations stuck at `opacity: 0` — content invisible | Every visitor, homepage |
| P0-2 | Critical | Builder loads fully blank for ~3s, no loading state | Every builder user |
| P0-3 | Critical | Hardcoded sample data pre-fills a new user's CV | Every builder user |
| P0-4 | Critical | Download button produces no file and no feedback | Core conversion |
| P1-1 | High | `/pricing` route 404s but the footer links to it | Pricing-curious users |
| P1-2 | High | Wizard tab nav highlights but doesn't open / scroll to the section | Section navigation |
| P2-1 | Medium | Page-title / brand inconsistency ("Plate & Pen" vs "GetHired") | Trust, SEO |
| P2-2 | Medium | Hero claims "13+ templates", only ~5 present | Trust |
| P2-3 | Medium | All templates flagged PRO — no visible free path | Conversion |
| P2-4 | Medium | FAQ answer text truncated on some viewports | Comprehension |

### Scope correction (read this before starting)

During testing an earlier note flagged `/checker` as a 404. That was a **wrong-URL guess**, not a real bug. The "Check My CV Free" CTAs are **correctly wired** to `/tools/cruise-cv-checker`, which loads and works — the role dropdown populates all 13 roles and role selection registers correctly ("Bartender / Bar Waiter" confirmed selectable). **Do not create a `/checker` route.** The only genuine dead route is `/pricing` (confirmed server-level `404`).

---

## 3. The bugs

---

### P0-1 — Landing page reveal animations never fire (content invisible)

**Symptom:** Scrolling the homepage shows large blank white bands where "How It Works", "Built Different", and "See exactly where your CV fails" should render. The content is in the DOM but never becomes visible.

**Evidence from test:**
- 31 elements carry the class `gh-reveal`.
- Sampled `gh-reveal` elements report computed `opacity: 0` — including the "How It Works" eyebrow, the "Three steps from rejected to interview-ready" H2, and the three step cards.
- The reveal is gated on a scroll trigger (IntersectionObserver or scroll listener) that is meant to add a visible / `in-view` state. It is not firing, so elements stay at their initial `opacity: 0`.

**Hypotheses to verify — do not assume which:**
1. The observer attaches before hydration on Workers (ref is null at setup), so the callback never runs.
2. The threshold / rootMargin never satisfies for very tall sections.
3. The observer runs, but the CSS class that sets `opacity: 1` is missing or misnamed.

**INVESTIGATE:** Grep `gh-reveal`, `IntersectionObserver`, `in-view`, `reveal`. Read where the observer is created relative to hydration and how the visible class is applied in CSS.

**RED — write these failing tests first:**

1. Component test — observer fires:
   ```ts
   // reveal.test.tsx
   it('reveals gh-reveal elements once intersecting', () => {
     // mock IntersectionObserver, render the section,
     // invoke the observer callback with { isIntersecting: true }
     // expect the element to gain the visible class / opacity 1
   })
   ```
2. **Failsafe test (the critical one) — encodes the release rule that no animation may leave content permanently hidden:**
   ```ts
   it('falls back to visible when IntersectionObserver is unavailable', () => {
     // render with global.IntersectionObserver = undefined
     // expect content opacity 1 (NOT 0)
   })
   ```
3. E2E — real scroll:
   ```ts
   // homepage-reveal.spec.ts
   // load '/', scroll to each section,
   // assert the heading text toBeVisible() (Playwright checks opacity)
   ```

**FIX (direction — confirm against investigation):**
- Attach the observer after hydration (`useEffect`, guarded ref).
- Add a **no-observer fallback**: if `IntersectionObserver` is undefined, or the element is already within the viewport at mount, apply the visible state immediately. Content must never depend solely on a scroll event to appear.
- Honour `prefers-reduced-motion`: those users get content at `opacity: 1` with no transition.

**GREEN — acceptance criteria:**
- [ ] All three tests pass.
- [ ] On a preview deploy, every homepage section's text is visible on first scroll.
- [ ] With JavaScript disabled, all content still shows (progressive enhancement).
- [ ] No blank band taller than its own heading remains.

**Regression risk:** The reveal hook is shared across the marketing site. Re-run the full E2E for `/` and `/tools/cruise-cv-checker`.

---

### P0-2 — Builder renders blank for ~3s with no loading state

**Symptom:** Navigating to `/builder` shows a fully white page for roughly 3 seconds before the form appears. No spinner, skeleton, or text. Reads as broken → high bounce risk.

**INVESTIGATE:** Determine what the blank window actually is:
- (a) route-level code-split chunk loading,
- (b) a Supabase draft fetch blocking first paint, or
- (c) hydration delay.

Check the `/builder` route component and any `loader` / `pendingComponent` in the TanStack Router config.

**RED:**
1. Component test — render the builder in a "data still loading" state, assert a skeleton/spinner with a `data-testid` is present (currently absent → red).
2. E2E — navigate to `/builder`, assert a loading indicator is visible within ~100ms of navigation, then the form appears.

**FIX (direction):**
- Use TanStack Router's `pendingComponent` / `pendingMs` for the `/builder` route, or a Suspense boundary with a skeleton fallback that mirrors the form layout.
- If a Supabase draft fetch is blocking paint, render the shell immediately and hydrate the draft asynchronously.

**GREEN — acceptance criteria:**
- [ ] A skeleton or spinner is visible within 100ms of route entry.
- [ ] No white flash longer than 200ms on a throttled (Fast 3G) profile.
- [ ] Tests pass.

**Regression risk:** Touches route config. Smoke-test `/` and the checker route for unintended pending states.

---

### P0-3 — Hardcoded sample data pre-fills a new user's CV

**Symptom:** A brand-new builder session opens **already populated** with someone else's CV:
- Name: `Thabo Nkosi` · Job title: `Bartender` · Email: `thabo.nkosi@gmail.com` · Phone: `+27 71 234 5678` · LinkedIn: `linkedin.com/in/…`
- Professional summary: a WSET Level 3 **sommelier** blurb — which mismatches the "Bartender" job title.
- Experience: Head Sommelier @ Maison Laurent (London); Sommelier @ Trattoria Bianco (Milan). Plus seeded Skills, Education, Certifications, Languages.
- Avatar shows "TN" initials. Preview renders this full fake CV.

**Why this is P0:** A new user cannot tell whether this is their data, a locked template, or a bug. If autosave / Supabase draft is active, the fake data may persist into their session. The Bartender-vs-Sommelier mismatch also means the "Tailor for Bartender" AI action operates on the wrong content.

**INVESTIGATE:** Find where the builder's initial state is seeded. Grep `Thabo`, `Maison Laurent`, `Trattoria`, or the default form-state object / store / `defaultValues`. Determine whether dev seed data is shipping to production.

**Decision required from Tino — pick one (default: A):**
- **(A) Ship blank.** New sessions start empty with helpful placeholders. Sample data moves behind an explicit "Load example CV" button.
- **(B) Ship labelled.** Keep the example but show a dismissible banner — "This is an example, clear it to start yours" — plus a one-click **Clear all** reset.

**RED — written for option A (adjust if B is chosen):**
1. Store/state test — initialise a fresh builder store, assert every field is empty / default (currently seeded → red).
2. Component test — render the builder with no saved draft, assert inputs show placeholder text, not values.
3. E2E — open `/builder` in a clean context (no Supabase draft), assert the Full Name input `toHaveValue('')`.
4. If a "Load example" button is added — test that clicking it populates the sample set and that "Clear all" empties it.
5. **PII guard test** — assert the shipped default state / bundle contains none of these tokens: `Thabo Nkosi`, `thabo.nkosi@gmail.com`, `+27 71 234 5678`, `Maison Laurent`, `Trattoria Bianco`.

**FIX (direction):**
- Remove seed data from the default state path. Gate the example set behind an explicit user action.
- Ensure a new authenticated user with no stored draft gets empty state; only a real saved draft rehydrates.
- Fix the role/summary coupling so "Tailor for {role}" always reads the current job title.

**GREEN — acceptance criteria:**
- [ ] Fresh session (no draft) = all fields empty.
- [ ] PII guard test passes — none of the sample tokens ship in default state.
- [ ] Example data reachable only via explicit action (if kept at all).
- [ ] Autosave does not write sample data into a new user's Supabase draft.

**Regression risk:** Touches core form state. Run the entire builder E2E (all sections) and the preview + download paths afterward.

---

### P0-4 — Download produces no file and no feedback

**Symptom:** In Preview, clicking **Download** (bottom nav) does nothing visible — no file, no dialog, no toast, no error.

**INVESTIGATE:** Find the Download handler and the PDF generation path. Grep `Download`, `ResumePDF`, `pdf`, `blob`, and the PDF library in use (e.g. `@react-pdf`). The key question: **does PDF generation work in the Cloudflare Workers runtime?** Many PDF libraries assume Node or browser APIs that are absent on Workers. On click, watch the console and network for a thrown error or a failed request.

**RED:**
1. Unit test the generator — given a populated CV model, it returns non-empty PDF bytes/blob (`> 1KB`, starts with `%PDF`).
2. Handler test — clicking Download calls the generator and triggers a save; on failure it surfaces a visible error toast (currently silent → red).
3. E2E — fill a minimal CV → Preview → Download → assert a download event fires (`page.waitForEvent('download')`).

**FIX (direction):**
- Wire the handler to the generator if they are disconnected.
- If the library is Workers-incompatible, generate client-side in the browser (not on the Worker), or move generation to a compatible path. Decide after investigation and record the choice in the commit body.
- Add success and failure feedback (toast / spinner). **Silent failure is itself a bug** — the primary conversion action must never be feedback-less.

**GREEN — acceptance criteria:**
- [ ] Download yields a valid, openable PDF containing the user's *actual* field values.
- [ ] A loading state shows during generation; an error toast shows on failure.
- [ ] The E2E download test passes against a preview deploy, not just local.

**Regression risk:** Isolated logic, but depends on P0-3 — it must download the user's data, not the sample. Do P0-3 first.

---

### P1-1 — `/pricing` 404s but is linked in the footer

**Symptom:** Footer "Pricing" link points to `/pricing`, which returns a server-level `404` (confirmed via `fetch('/pricing') → status 404`).

**Decision required — pick one:**
- **(A)** Build the pricing page.
- **(B)** Remove the footer link until pricing exists.

**RED:**
1. E2E — click the footer "Pricing" link, assert it does **not** land on the 404 component.
   - For (A): assert a pricing heading is visible.
   - For (B): assert no "Pricing" link exists in the footer.
2. **Link-inventory test (preferred, stronger):** crawl every internal `<a href>` on `/`, `/builder`, `/tools/cruise-cv-checker`; assert each resolves to a non-404 (200) response.

**FIX:** Per the decision. If (B), grep for and remove any other `/pricing` references.

**GREEN — acceptance criteria:**
- [ ] No footer link resolves to the 404 page.
- [ ] Link-inventory test passes across the three core routes.

---

### P1-2 — Wizard tab nav highlights but doesn't open the section

**Symptom:** In the builder, the top nav (Personal / Experience / Education / Skills / Certifications / Hospitality) highlights the clicked tab, but the view stays on Personal details. The sections exist as collapsed accordions (`#section-experience`, `#section-education`, etc. — each ~53px tall, i.e. header only). Clicking a tab neither scrolls to nor expands its section.

**Evidence from test:** Section elements confirmed present with IDs `section-personal` (1251px, expanded) and `section-experience` / `-education` / `-skills` / `-certifications` (each ~53px, collapsed). Tab buttons have `onclick` handlers attached, but clicking only toggles active styling.

**INVESTIGATE:** Read the tab `onclick` handlers and the accordion open-state logic. The tabs currently update an "active" style but do not drive the accordion `open` state or scroll position.

**RED:**
1. Component test — click the "Experience" tab, assert the Experience accordion is expanded (`aria-expanded="true"`) and its inputs are present/visible.
2. E2E — click each tab in turn, assert the matching section scrolls into view and is expanded.

**FIX (direction):** On tab click, set that section's accordion to open **and** call `scrollIntoView({ behavior, block: 'start' })` on the section anchor. Keep active-tab styling in sync with the section actually in view (optional: scroll-spy).

**GREEN — acceptance criteria:**
- [ ] Clicking any tab expands and scrolls to its section.
- [ ] `aria-expanded` reflects the true state (accessibility).
- [ ] The active tab stays in sync with the visible section.

**Regression risk:** Shared accordion state — verify that manual accordion toggles still work independently of the tabs.

---

### P2-1 — Brand / title inconsistency ("Plate & Pen" vs "GetHired")

**Symptom:** The `/builder` document title is `Plate & Pen — Resume Builder for Hospitality Pros`, while the rest of the app is `GetHired` (e.g. homepage `GetHired — Cruise Ship CV Builder`). "Plate & Pen" is a different brand name entirely — confusing across tabs and bad for brand recognition and SEO.

**RED:** Test asserting every route's `document.title` starts with `GetHired`. `/builder` fails.

**FIX:** Replace the stray "Plate & Pen" title (grep it) with the GetHired convention.

**GREEN — acceptance criteria:**
- [ ] All route titles conform to `GetHired — {page}`.
- [ ] No "Plate & Pen" string remains anywhere in the bundle.

---

### P2-2 — "13+ templates" claim vs ~5 present

**Symptom:** The hero stat reads "13+ TEMPLATES". The Templates panel shows ~5 (Noir, Executive, Harbour, Admiral, Stew…, with 5 carousel dots).

**RED:** Test asserting the advertised count equals the number of registered templates. Derive the hero number from the template registry — do not hardcode it in the test.

**FIX:** Either surface all templates, or bind the hero stat to `templates.length`. Prefer a single source of truth so the number cannot drift again.

**GREEN — acceptance criteria:**
- [ ] Hero count equals the actual selectable template count.
- [ ] A test guards this invariant.

---

### P2-3 — All templates PRO-locked, no visible free path

**Symptom:** Every template card shows a `PRO` badge. The FAQ states the builder is usable, but if no template is free, the core flow cannot complete without paying — no free path means no conversion.

**Decision required (Tino):** Confirm the free-tier model. Either mark ≥1 template `Free`, or make the upgrade path explicit at the point of use.

**RED:** Test asserting at least one template has `tier: 'free'` (if that is the intended model), or that selecting a locked template surfaces a clear upgrade CTA.

**GREEN — acceptance criteria:**
- [ ] A free path exists, or the upgrade path is explicit and tested.

---

### P2-4 — FAQ answer text truncated on some viewports

**Symptom:** The expanded "What is ATS?" answer visually clips mid-sentence at narrower widths.

**INVESTIGATE:** Likely a fixed `max-height` on the accordion panel that doesn't account for content length, or `overflow: hidden` without a large-enough expanded height.

**RED:** E2E at mobile (375px) and desktop (1280px) widths — expand each FAQ, assert the full answer text is present and not clipped (compare `scrollHeight` vs `clientHeight`).

**FIX:** Animate to content height (sufficient `max-height`, or an auto-height technique); remove the hard clip.

**GREEN — acceptance criteria:**
- [ ] All FAQ answers are fully visible at 375px and 1280px.

---

## 4. Cross-cutting regression suite (run after all fixes)

Fill `tests/e2e/smoke.spec.ts` with these as the release gate:

1. **No-404 crawl** — every internal link on `/`, `/builder`, `/tools/cruise-cv-checker` returns 200.
2. **No invisible content** — on `/`, every section heading `toBeVisible()` after scroll.
3. **Clean builder** — a fresh session → all fields empty.
4. **Full happy path** — land → open checker → select role → (upload stub) → open builder → fill required fields → Preview shows the entered data → Download yields a valid PDF.
5. **No PII tokens** — the shipped default state contains none of the sample tokens (`Thabo Nkosi`, sample email/phone, `Maison Laurent`, `Trattoria Bianco`).
6. **Title convention** — all routes titled `GetHired — …`.

CI runs `test:all` and blocks merge on failure.

---

## 5. Commit / PR convention (per loop)

```
fix(P0-1): reveal content when IntersectionObserver never fires

INVESTIGATE: gh-reveal elements initialise at opacity:0; the observer
attached pre-hydration on Workers, so the callback never ran and content
stayed permanently hidden.

TEST (red→green): added reveal.test.tsx including the no-observer fallback
case; homepage e2e now asserts each section visible on scroll.

RISK: shared reveal hook — full marketing-site e2e re-run, green.
```

- One bug per PR. Reference the P-ID in the title.
- Paste the red→green test output in the PR body.
- Do not close a P-item until every one of its acceptance checkboxes is ticked in the PR.

---

## 6. Suggested order of execution

Smallest blast radius / highest visibility first. The ordering is deliberate — later items depend on earlier ones.

1. **P0-3** — clean / correct builder state. Unblocks honest testing of Preview and Download.
2. **P0-2** — builder loading state. Cheap, high perceived-quality win.
3. **P0-1** — reveal animations. Most visible defect to every visitor.
4. **P0-4** — download. Depends on P0-3 being green (must download real user data).
5. **P1-1** — pricing 404. Then **P1-2** — tab navigation.
6. **P2-1 → P2-4** — polish.

**Hard dependency:** Do not start P0-4 before P0-3 is green.

---

## 7. Open decisions for Tino (resolve before the affected loop)

| Item | Decision needed | Default if no answer |
|------|-----------------|----------------------|
| P0-3 | Ship blank, or ship labelled-example with reset? | **Blank** (example behind a button) |
| P1-1 | Build `/pricing`, or remove the footer link? | **Remove link** until page exists |
| P2-3 | Is there a genuine free template tier? | **Mark ≥1 template Free** |

---

*End of bug-fix.md*