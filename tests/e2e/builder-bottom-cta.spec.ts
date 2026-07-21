import { test, expect, Page } from "@playwright/test";

// Step 6 — single primary CTA pinned to the bottom of the viewport.
// Covers the verify-cv-builder-step checklist at 375 / 850 / 1280 plus the
// clearance, mode-label, lightbox-coexistence and export-wiring assertions.

const WIDTHS = [
  { name: "375px", width: 375, height: 812, mobile: true },
  { name: "850px", width: 850, height: 1000, mobile: true },
  { name: "1280px", width: 1280, height: 900, mobile: false },
];

function watchConsole(page: Page) {
  const errors: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  return errors;
}

async function openBuilder(page: Page) {
  await page.goto("/builder");
  await page
    .waitForSelector('[data-testid="builder-skeleton"]', { state: "detached", timeout: 20000 })
    .catch(() => {});
  const nameInput = page.getByTestId("input-fullname");
  await nameInput.waitFor({ state: "visible", timeout: 20000 });
  const sample = page.getByRole("button", { name: "Load example CV" });
  if (await sample.isVisible().catch(() => false)) await sample.click();
  await page.waitForTimeout(400);
}

const tab = (page: Page, name: "Edit" | "Preview") => page.getByRole("tab", { name, exact: true });

for (const vp of WIDTHS.filter((v) => v.mobile)) {
  test.describe(`pinned CTA @ ${vp.name}`, () => {
    test.use({ viewport: { width: vp.width, height: vp.height } });
    test.describe.configure({ timeout: 90_000 });

    test("stays pinned, full width and thumb-reachable at every scroll position", async ({
      page,
      context,
    }) => {
      const errors = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);

      const bar = page.getByTestId("bottom-cta-bar");
      const cta = page.getByTestId("bottom-cta");
      await expect(bar).toBeVisible();
      expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");

      // Full width, flush with the bottom edge, tap target >= 44px
      const barBox = (await bar.boundingBox())!;
      expect(barBox.x).toBe(0);
      expect(barBox.width).toBe(vp.width);
      expect(barBox.y + barBox.height).toBeCloseTo(vp.height, 0);
      const ctaBox = (await cta.boundingBox())!;
      expect(ctaBox.height).toBeGreaterThanOrEqual(44);
      expect(ctaBox.width).toBeGreaterThan(vp.width - 40);

      // Pinned across scroll positions
      for (const y of [0, 400, 99999]) {
        await page.evaluate((to) => window.scrollTo(0, to), y);
        await page.waitForTimeout(150);
        await expect(bar).toBeVisible();
        const b = (await bar.boundingBox())!;
        expect(b.y + b.height).toBeCloseTo(vp.height, 0);
      }

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });

    test("never overlaps the last accordion section at the bottom of the scroll", async ({
      page,
      context,
    }) => {
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);

      // Expand every section so the accordion is at its tallest
      for (const id of ["experience", "education", "skills", "certifications", "hospitality"]) {
        const header = page.locator(`#section-${id} button`).first();
        if (await header.isVisible().catch(() => false)) {
          const expanded = await header.getAttribute("aria-expanded");
          if (expanded === "false") await header.click();
        }
      }
      await page.waitForTimeout(400);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const barBox = (await page.getByTestId("bottom-cta-bar").boundingBox())!;

      // The last section's box must not intersect the CTA's box
      const lastBox = (await page.locator("#section-hospitality").boundingBox())!;
      expect(lastBox.y + lastBox.height).toBeLessThanOrEqual(barBox.y);

      // …because the accordion reserves the CTA's full height as bottom padding
      const [padBottom, ctaH] = await page.evaluate(() => {
        const el = document.querySelector('[data-testid="builder-sections"]')!;
        return [
          parseFloat(getComputedStyle(el).paddingBottom),
          parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--cta-h")),
        ];
      });
      expect(padBottom).toBeGreaterThanOrEqual(ctaH);
    });

    test("label follows the active mode across Edit → Preview → Edit", async ({
      page,
      context,
    }) => {
      const errors = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);

      const cta = page.getByTestId("bottom-cta");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("data-mode", "edit");
      await expect(cta).toHaveText(/Download/);

      await tab(page, "Preview").click();
      await page.waitForTimeout(300);
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("data-mode", "preview");
      await expect(cta).toHaveText(/Download/);

      await tab(page, "Edit").click();
      await page.waitForTimeout(300);
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("data-mode", "edit");
      await expect(cta).toHaveText(/Download/);

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });

    test("steps aside for the zoom lightbox and returns on close", async ({ page, context }) => {
      const errors = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);
      await tab(page, "Preview").click();
      await page.waitForTimeout(300);

      const bar = page.getByTestId("bottom-cta-bar");
      await expect(bar).toBeVisible();

      // Open the lightbox — CTA must not compete with its zoom controls
      await page.getByTestId("preview-expand-btn").click();
      await expect(page.getByTestId("preview-lightbox")).toBeVisible();
      await expect(bar).toHaveCount(0);
      await expect(page.getByTestId("lightbox-zoom-controls")).toBeVisible();

      // Close via the close button — CTA returns in the Preview state
      await page.locator("#lightbox-close").click();
      await expect(page.getByTestId("preview-lightbox")).toHaveCount(0);
      await expect(bar).toBeVisible();
      await expect(page.getByTestId("bottom-cta")).toHaveAttribute("data-mode", "preview");

      // Same again, closing with Escape
      await page.getByTestId("preview-expand-btn").click();
      await expect(bar).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByTestId("preview-lightbox")).toHaveCount(0);
      await expect(bar).toBeVisible();

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });

    test("tapping the CTA fires the existing export flow", async ({ page, context }) => {
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);

      // Spy on the existing flow rather than re-verifying export: record the
      // export overlay appearing (it can come and go faster than a poll).
      await page.evaluate(() => {
        (window as unknown as { __exportFired: boolean }).__exportFired = false;
        new MutationObserver(() => {
          if (document.querySelector('[data-testid="pdf-loading"]')) {
            (window as unknown as { __exportFired: boolean }).__exportFired = true;
          }
        }).observe(document.body, { childList: true, subtree: true });
      });

      const download = page.waitForEvent("download", { timeout: 30000 }).catch(() => null);
      await page.getByTestId("bottom-cta").click();
      await download;

      const fired = await page.evaluate(
        () => (window as unknown as { __exportFired: boolean }).__exportFired,
      );
      expect(fired, "export handler did not fire").toBe(true);
    });

    test("form state survives an Edit → Preview → Edit round trip", async ({ page, context }) => {
      const errors = watchConsole(page);
      await context.addInitScript(() => localStorage.clear());
      await openBuilder(page);

      await page.getByTestId("input-fullname").fill("Zola Ndlovu");
      await tab(page, "Preview").click();
      await page.waitForTimeout(300);
      await tab(page, "Edit").click();
      await expect(page.getByTestId("input-fullname")).toHaveValue("Zola Ndlovu");

      // Sticky mode switcher stays pinned through a scroll
      const switcher = page.locator(".mobile-mode-switcher");
      const top = (await switcher.boundingBox())!.y;
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(200);
      expect((await switcher.boundingBox())!.y).toBeCloseTo(top, 0);

      expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
    });
  });
}

// ── Desktop: the CTA is mobile chrome; the split pane keeps its own export ──
test.describe("pinned CTA @ 1280px", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  test.describe.configure({ timeout: 90_000 });

  test("desktop layout is unaffected — no pinned CTA, both panes render", async ({
    page,
    context,
  }) => {
    const errors = watchConsole(page);
    await context.addInitScript(() => localStorage.clear());
    await openBuilder(page);

    await expect(page.getByTestId("bottom-cta-bar")).toBeHidden();
    await expect(page.locator(".mobile-mode-switcher")).toBeHidden();
    // Editor and preview are both on screen (two-pane split)
    await expect(page.getByTestId("input-fullname")).toBeVisible();
    await expect(page.getByTestId("cv-document")).toBeVisible();

    expect(errors, `console errors: ${errors.join(" | ")}`).toEqual([]);
  });
});
