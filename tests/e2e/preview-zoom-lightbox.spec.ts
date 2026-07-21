import { test, expect, Page } from "@playwright/test";

// Step 5 — full-screen zoom lightbox for the CV preview.
// Runs the verify-cv-builder-step checklist at 375 / 850 / 1280 plus the
// lightbox-specific open → zoom → pan → close assertions.

const WIDTHS = [
  { name: "375px", width: 375, height: 812, mobile: true },
  { name: "850px", width: 850, height: 1000, mobile: true },
  { name: "1280px", width: 1280, height: 900, mobile: false },
];

/** Console errors collected for a page. Warnings tracked separately. */
function watchConsole(page: Page) {
  const errors: string[] = [];
  const warnings: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
    if (m.type() === "warning") warnings.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return { errors, warnings };
}

async function openBuilderWithContent(page: Page) {
  await page.goto("/builder");
  await page
    .waitForSelector('[data-testid="builder-skeleton"]', { state: "detached", timeout: 20000 })
    .catch(() => {});
  const nameInput = page.getByTestId("input-fullname");
  await nameInput.waitFor({ state: "visible", timeout: 20000 });
  const sample = page.getByRole("button", { name: "Load example CV" });
  if (await sample.isVisible().catch(() => false)) {
    await sample.click();
  } else {
    await nameInput.fill("Jane Hospitality");
  }
  await page.waitForTimeout(400);
}

/** Step the lightbox zoom to a target label (e.g. "125%"). */
async function setZoom(page: Page, target: string) {
  const level = page.locator("#lightbox-zoom-level");
  for (let i = 0; i < 8; i++) {
    const current = parseInt((await level.textContent())!, 10);
    if (current === parseInt(target, 10)) return;
    await page
      .locator(current > parseInt(target, 10) ? "#lightbox-zoom-out" : "#lightbox-zoom-in")
      .click();
  }
  await expect(level).toHaveText(target);
}

/** Switch to the Preview tab (mobile bottom nav) — no-op on desktop. */
async function gotoPreviewTab(page: Page, mobile: boolean) {
  if (!mobile) return;
  await page.getByRole("button", { name: "Preview", exact: true }).first().click();
  await page.waitForTimeout(300);
}

for (const vp of WIDTHS) {
  test.describe(`zoom lightbox @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    // Stepping every zoom stop and panning at each is click-heavy; the default
    // 30s is not enough on a cold dev server with parallel workers.
    test.describe.configure({ timeout: 90_000 });

    test("expand button opens a full-viewport overlay; zoom steps; close restores preview", async ({
      page,
      context,
    }) => {
      const { errors } = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilderWithContent(page);
      await gotoPreviewTab(page, vp.mobile);

      // ── Expand button: visible, circular, reserves no layout space ────────
      const expand = page.getByTestId("preview-expand-btn");
      await expect(expand).toBeVisible();
      const expandBox = (await expand.boundingBox())!;
      expect(expandBox.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(expandBox.width - expandBox.height)).toBeLessThan(2);
      expect(await expand.evaluate((el) => getComputedStyle(el).position)).toBe("absolute");

      // Centred on the document's container
      const panelBox = (await page.locator(".preview-panel-outer").boundingBox())!;
      const expandCx = expandBox.x + expandBox.width / 2;
      expect(Math.abs(expandCx - (panelBox.x + panelBox.width / 2))).toBeLessThan(2);

      // ── State snapshot before opening ─────────────────────────────────────
      const before = await page.evaluate(() => ({
        scrollY: window.scrollY,
        docHtml: document.querySelector('[data-testid="cv-document"]')?.outerHTML ?? "",
        activeTabButtons: [...document.querySelectorAll('[role="tab"]')].map((b) =>
          b.getAttribute("aria-selected"),
        ),
      }));

      // ── Open ──────────────────────────────────────────────────────────────
      await expand.click();
      const overlay = page.getByTestId("preview-lightbox");
      await expect(overlay).toBeVisible();

      // Covers the full viewport
      const overlayBox = (await overlay.boundingBox())!;
      expect(overlayBox.x).toBe(0);
      expect(overlayBox.y).toBe(0);
      expect(overlayBox.width).toBe(vp.width);
      expect(overlayBox.height).toBe(vp.height);
      expect(await overlay.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");

      // ── Zoom: 100 → 125 → 150, then back to 100 ───────────────────────────
      const doc = page.getByTestId("lightbox-cv-document");
      const level = page.locator("#lightbox-zoom-level");
      await expect(level).toHaveText("100%");
      const w100 = (await doc.boundingBox())!.width;

      await page.locator("#lightbox-zoom-in").click();
      await expect(level).toHaveText("125%");
      const w125 = (await doc.boundingBox())!.width;
      expect(w125 / w100).toBeCloseTo(1.25, 2);

      await page.locator("#lightbox-zoom-in").click();
      await expect(level).toHaveText("150%");
      const w150 = (await doc.boundingBox())!.width;
      expect(w150 / w100).toBeCloseTo(1.5, 2);

      await page.locator("#lightbox-zoom-out").click();
      await page.locator("#lightbox-zoom-out").click();
      await expect(level).toHaveText("100%");
      expect((await doc.boundingBox())!.width).toBeCloseTo(w100, 1);

      // ── Pannable at any zoom level ────────────────────────────────────────
      const pan = page.getByTestId("lightbox-pan");
      for (const target of ["50%", "75%", "100%", "125%", "150%"]) {
        await setZoom(page, target);
        const scrollable = await pan.evaluate((el) => ({
          x: el.scrollWidth > el.clientWidth,
          y: el.scrollHeight > el.clientHeight,
        }));
        expect(scrollable.x || scrollable.y, `pannable at ${target}`).toBe(true);
        await pan.evaluate((el) => {
          el.scrollTop = 120;
          el.scrollLeft = 40;
        });
        const scrolled = await pan.evaluate((el) => el.scrollTop + el.scrollLeft);
        expect(scrolled, `pan moved at ${target}`).toBeGreaterThan(0);
        await pan.evaluate((el) => {
          el.scrollTop = 0;
        });
      }
      // Back to 100% for the close assertions
      await setZoom(page, "100%");

      // ── Controls: fixed to the bottom, thumb-reachable, 44px targets ──────
      const controls = page.getByTestId("lightbox-zoom-controls");
      expect(await controls.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
      const cBox = (await controls.boundingBox())!;
      expect(vp.height - (cBox.y + cBox.height)).toBeLessThanOrEqual(48);
      for (const id of ["#lightbox-zoom-out", "#lightbox-zoom-in", "#lightbox-close"]) {
        const b = (await page.locator(id).boundingBox())!;
        expect(b.width, `${id} width`).toBeGreaterThanOrEqual(44);
        expect(b.height, `${id} height`).toBeGreaterThanOrEqual(44);
      }

      // ── Close via the close button ────────────────────────────────────────
      await page.locator("#lightbox-close").click();
      await expect(overlay).toHaveCount(0);

      const afterClose = await page.evaluate(() => ({
        scrollY: window.scrollY,
        docHtml: document.querySelector('[data-testid="cv-document"]')?.outerHTML ?? "",
        activeTabButtons: [...document.querySelectorAll('[role="tab"]')].map((b) =>
          b.getAttribute("aria-selected"),
        ),
      }));
      expect(afterClose.scrollY).toBe(before.scrollY);
      expect(afterClose.docHtml).toBe(before.docHtml);
      expect(afterClose.activeTabButtons).toEqual(before.activeTabButtons);
      await expect(page.getByTestId("preview-expand-btn")).toBeVisible();

      // ── Close via Escape (separate cycle) ─────────────────────────────────
      await page.getByTestId("preview-expand-btn").click();
      await expect(page.getByTestId("preview-lightbox")).toBeVisible();
      // zoom resets to 100% on every open
      await expect(page.locator("#lightbox-zoom-level")).toHaveText("100%");
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("preview-lightbox")).toHaveCount(0);

      const afterEsc = await page.evaluate(() => ({
        scrollY: window.scrollY,
        docHtml: document.querySelector('[data-testid="cv-document"]')?.outerHTML ?? "",
      }));
      expect(afterEsc.scrollY).toBe(before.scrollY);
      expect(afterEsc.docHtml).toBe(before.docHtml);

      // ── Close via backdrop ────────────────────────────────────────────────
      await page.getByTestId("preview-expand-btn").click();
      await expect(page.getByTestId("preview-lightbox")).toBeVisible();
      await page.getByTestId("lightbox-pan").click({ position: { x: 4, y: 4 } });
      await expect(page.getByTestId("preview-lightbox")).toHaveCount(0);

      // ── Console clean through the whole cycle ─────────────────────────────
      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });

    test("document keeps A4 print proportions inside the lightbox", async ({ page, context }) => {
      await context.addInitScript(() => localStorage.clear());
      await openBuilderWithContent(page);
      await gotoPreviewTab(page, vp.mobile);
      await page.getByTestId("preview-expand-btn").click();

      const doc = page.getByTestId("lightbox-cv-document");
      // True A4 print width at 100% — no reflow to the viewport
      expect((await doc.boundingBox())!.width).toBeCloseTo(794, 0);
      const layoutWidth = await doc.evaluate((el) => (el as HTMLElement).offsetWidth);
      expect(layoutWidth).toBe(794);
    });

    test("lightbox chrome is excluded from print output", async ({ page, context }) => {
      await context.addInitScript(() => localStorage.clear());
      await openBuilderWithContent(page);
      await gotoPreviewTab(page, vp.mobile);

      await page.emulateMedia({ media: "print" });
      await expect(page.getByTestId("preview-expand-btn")).toBeHidden();

      await page.emulateMedia({ media: "screen" });
      await page.getByTestId("preview-expand-btn").click();
      await page.emulateMedia({ media: "print" });
      await expect(page.getByTestId("preview-lightbox")).toBeHidden();
      await expect(page.getByTestId("lightbox-zoom-controls")).toBeHidden();
    });
  });
}

// ── Skill checklist items that are breakpoint-specific ──────────────────────
for (const vp of WIDTHS.filter((v) => v.mobile)) {
  test.describe(`builder chrome regression @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    // Stepping every zoom stop and panning at each is click-heavy; the default
    // 30s is not enough on a cold dev server with parallel workers.
    test.describe.configure({ timeout: 90_000 });

    test("sticky switcher, pinned CTA and form round trip survive the lightbox", async ({
      page,
      context,
    }) => {
      const { errors } = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilderWithContent(page);

      // Type a value in the Edit tab
      const nameInput = page.getByTestId("input-fullname");
      await nameInput.fill("Zola Ndlovu");

      // Switcher stays pinned while scrolling
      const switcher = page.locator(".mobile-mode-switcher");
      const topBefore = (await switcher.boundingBox())!.y;
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(200);
      expect((await switcher.boundingBox())!.y).toBeCloseTo(topBefore, 0);

      // Bottom nav visible at this scroll position
      const nav = page.locator(".builder-bottom-nav");
      await expect(nav).toBeVisible();
      const navBox = (await nav.boundingBox())!;
      expect(navBox.y + navBox.height).toBeLessThanOrEqual(vp.height + 1);

      // Edit → Preview → open lightbox → close → Edit: value survives
      await gotoPreviewTab(page, true);
      await page.getByTestId("preview-expand-btn").click();
      await expect(page.getByTestId("preview-lightbox")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("preview-lightbox")).toHaveCount(0);
      await page.getByRole("button", { name: "Edit", exact: true }).first().click();
      await expect(page.getByTestId("input-fullname")).toHaveValue("Zola Ndlovu");

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });
  });
}
