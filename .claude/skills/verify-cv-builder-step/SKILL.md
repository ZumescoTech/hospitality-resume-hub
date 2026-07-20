---
name: verify-cv-builder-step
description: Verify any CV builder UI change end-to-end at all breakpoints before declaring it done. Use after every implementation step of the editor rebuild.
---

# Verifying CV builder UI steps
Never report a step complete based on a successful edit alone. Verify like a human reviewer:

1. Start the dev server.
2. Test at three viewport widths: 375px, 850px, and 1280px (use Playwright or Chrome DevTools MCP to set viewport programmatically — do not eyeball).
3. At 375px and 850px confirm: the sticky mode switcher stays pinned on scroll; the pinned bottom CTA is visible at all scroll positions and does not overlap the last content section; form state survives an Edit → Preview → Edit round trip (type a value, switch tabs, switch back, assert the value).
4. At 1280px confirm the desktop layout is unaffected (until Step 8, when the two-pane split becomes the desktop expectation).
5. Check all interactive elements added in this step: click/tap each one, assert the expected state change, screenshot before/after.
6. Tap targets: every new interactive row/button must be >=44px tall at 375px.
7. Browser console: zero new errors or warnings at every width tested.
8. Regression: the CV preview render must still match export/print proportions (no reflow of the document itself).

If any check fails, fix and rerun from step 1. Report which checks ran and pass/fail for each — never hand back partially verified work.
