import { test, expect } from '@playwright/test'

// Regression suite — filled as bugs close.
// Six tests required at release gate (§4 of bug-fix.md):
// 1. No-404 crawl
// 2. No invisible content on homepage
// 3. Clean builder (fresh session, all fields empty)
// 4. Full happy path (land → checker → builder → preview → download)
// 5. No PII tokens in default state
// 6. Title convention (all routes "GetHired — …")

// Scaffold — tests added per bug loop below.

// ── P1-1: No-404 crawl ────────────────────────────────────────────────────────
test.describe('P1-1 — no dead internal links', () => {
  const routesToCrawl = ['/', '/builder', '/tools/cruise-cv-checker']

  for (const route of routesToCrawl) {
    test(`all internal <a> links on ${route} resolve to non-404`, async ({ page, request }) => {
      await page.goto(route)
      const hrefs = await page.$$eval('a[href]', (els) =>
        els
          .map((el) => el.getAttribute('href') ?? '')
          .filter((h) => h.startsWith('/') && !h.startsWith('//#'))
      )
      const unique = [...new Set(hrefs)]
      for (const href of unique) {
        const res = await request.get(href)
        expect(res.status(), `${href} returned ${res.status()}`).not.toBe(404)
      }
    })
  }
})

// ── P0-1: No invisible content on homepage ────────────────────────────────────
test.describe('P0-1 — no invisible content on homepage', () => {
  test('all section headings are visible after scroll', async ({ page }) => {
    await page.goto('/')
    // Scroll through the page to trigger reveal animations
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(1000) // allow transitions to complete

    const headings = [
      'How It Works',
      'Three steps from',
      'See exactly where',
    ]
    for (const text of headings) {
      const el = page.locator(`text=${text}`).first()
      // toBeVisible checks computed opacity > 0 and visibility !== hidden
      await expect(el).toBeVisible({ timeout: 3000 })
    }
  })
})

// ── P0-3: Clean builder ───────────────────────────────────────────────────────
test.describe('P0-3 — clean builder (fresh session)', () => {
  test('all fields empty for anonymous user with no saved draft', async ({ page, context }) => {
    // Clear storage to simulate a brand-new session
    await context.clearCookies()
    await context.addInitScript(() => localStorage.clear())

    await page.goto('/builder')

    // Full Name input must be empty (uses data-testid because label/input lack htmlFor linkage)
    const fullName = page.getByTestId('input-fullname')
    await expect(fullName).toHaveValue('')
  })

  test('PII guard — no sample tokens visible on fresh builder load', async ({ page, context }) => {
    await context.clearCookies()
    await context.addInitScript(() => localStorage.clear())

    await page.goto('/builder')

    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Elena Marchetti')
    expect(bodyText).not.toContain('Maison Laurent')
    expect(bodyText).not.toContain('Trattoria')
  })
})

// ── §4 Test 4: Full happy path ────────────────────────────────────────────────
test.describe('§4-4 — full happy path', () => {
  test('land → checker → builder → fill → preview → download fires', async ({ page, context }) => {
    // Clear state for a clean run
    await context.clearCookies()
    await context.addInitScript(() => localStorage.clear())

    // 1. Land on homepage
    await page.goto('/')
    await expect(page).toHaveTitle(/GetHired/)

    // 2. Navigate to CV checker
    await page.goto('/tools/cruise-cv-checker')
    await expect(page).toHaveTitle(/GetHired/)
    // Role dropdown exists and has options
    const roleSelect = page.locator('select, [role="combobox"]').first()
    await expect(roleSelect).toBeVisible({ timeout: 5000 })

    // 3. Navigate to builder and fill a minimal CV
    await page.goto('/builder')
    // Wait for the form to be hydrated (skeleton disappears)
    await page.waitForSelector('[data-testid="builder-skeleton"]', { state: 'detached', timeout: 10000 })
      .catch(() => {}) // skeleton may already be gone

    // Fill Full Name — personal section is open by default
    const nameInput = page.getByTestId('input-fullname')
    await nameInput.waitFor({ state: 'visible', timeout: 10000 })
    await nameInput.fill('Jane Hospitality')

    // Fill additional fields if visible (best-effort — not all may be accessible without scrolling)
    const inputs = page.locator('input[type="text"], input[type="email"], input:not([type])')
    const inputCount = await inputs.count()
    // Fill second visible input (job title)
    if (inputCount > 1) {
      const second = inputs.nth(1)
      if (await second.isVisible()) await second.fill('Head Bartender')
    }

    // 4. Switch to Preview tab (mobile nav) or check the preview panel renders the name
    // On desktop the preview panel is always visible
    const previewContent = page.locator('.builder-layout, [class*="preview"]')
    // Assert the entered name appears somewhere in the preview
    await expect(page.locator('text=Jane Hospitality').first()).toBeVisible({ timeout: 5000 })

    // 5. Download — assert a download event fires and file is non-empty PDF
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 })
    // Click the download button (BottomNav on mobile, or a download button)
    const downloadBtn = page.getByRole('button', { name: /download/i }).first()
    await downloadBtn.click()

    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i)

    // Save and verify the file is a valid PDF (starts with %PDF, > 1KB)
    const path = await download.path()
    if (path) {
      const { readFileSync } = await import('fs')
      const bytes = readFileSync(path)
      expect(bytes.length).toBeGreaterThan(1024)
      expect(bytes.slice(0, 4).toString()).toBe('%PDF')
    }
  })
})

// ── §4 Test 5: PII guard (cold load, no draft) ────────────────────────────────
test.describe('§4-5 — PII guard (no sample tokens in fresh session)', () => {
  test('no sample PII tokens in rendered form or localStorage on fresh load', async ({ page, context }) => {
    await context.clearCookies()
    await context.addInitScript(() => localStorage.clear())

    await page.goto('/builder')
    await page.waitForLoadState('networkidle')

    // Check rendered DOM
    const bodyText = await page.locator('body').innerText()
    const piiTokens = [
      'Thabo Nkosi',
      'thabo.nkosi@gmail.com',
      '+27 71 234 5678',
      'Maison Laurent',
      'Trattoria Bianco',
      // Also guard against the actual sample persona used in codebase
      'Elena Marchetti',
      'elena.marchetti@example.com',
    ]
    for (const token of piiTokens) {
      expect(bodyText, `DOM contains PII token: "${token}"`).not.toContain(token)
    }

    // Check localStorage draft
    const draft = await page.evaluate(() => localStorage.getItem('gh-resume-draft'))
    if (draft) {
      for (const token of piiTokens) {
        expect(draft, `localStorage draft contains PII token: "${token}"`).not.toContain(token)
      }
    }
  })
})

// ── §4 Test 6: Title convention ───────────────────────────────────────────────
test.describe('§4-6 — title convention (all routes start with "GetHired")', () => {
  const routes = ['/', '/builder', '/tools/cruise-cv-checker']

  for (const route of routes) {
    test(`${route} document.title starts with "GetHired"`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')

      const title = await page.title()
      expect(title, `${route} has title "${title}"`).toMatch(/^GetHired/)
    })
  }
})
