/**
 * PDF export read-back (MVP brief §3C: "Test PDF parsing rather than promising
 * universal ATS compatibility").
 *
 * For every template: load the example CV, print to PDF exactly as the
 * Download PDF button does (print media, A4 from @page, backgrounds on), then
 * extract the text with pdf.js and check it is real selectable text, in a
 * logical reading order, with no builder UI in the file.
 *
 * Chromium only — page.pdf() is Chromium-only.
 * Run: BASE_URL=http://localhost:8788 npx playwright test pdf-export --project=chromium
 * (CHROME_EXE may point at an installed Chromium if Playwright's is missing.)
 */
import { test, expect } from '@playwright/test'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

const TEMPLATES = ['vintage', 'winelands', 'noir-premium', 'executive', 'harbour', 'admiral', 'steward'] as const

if (process.env.CHROME_EXE) test.use({ launchOptions: { executablePath: process.env.CHROME_EXE } })

async function pdfText(buffer: Buffer): Promise<{ pages: number; text: string }> {
  const doc = await getDocument({ data: new Uint8Array(buffer) }).promise
  let text = ''
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent()
    text += content.items.map((i) => ('str' in i ? i.str : '')).join(' ') + '\n'
  }
  return { pages: doc.numPages, text }
}

/** Letter-spaced headings extract as "SKI L LS"; compare without whitespace. */
const squash = (s: string) => s.replace(/\s+/g, '').toLowerCase()

test.describe('PDF export read-back', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'page.pdf() is Chromium-only')

  for (const id of TEMPLATES) {
    test(`${id}: selectable text, logical order, no builder UI`, async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.goto('/builder')
      await page.getByRole('button', { name: /example|sample/i }).first().click()
      await page.click('#toolbar-customize-btn')
      await page.click(`[data-testid="drawer-template-${id}"]`)
      await page.click('[data-testid="style-drawer-close"]')

      await page.emulateMedia({ media: 'print' })
      const { pages, text } = await pdfText(await page.pdf({ preferCSSPageSize: true, printBackground: true }))
      const flat = squash(text)

      expect(pages).toBe(1)

      // Key facts are extractable text, not pixels.
      for (const fact of ['Elena Marchetti', 'Head Sommelier', 'Maison Laurent', 'WSET']) {
        expect(flat, `${id} should contain "${fact}"`).toContain(squash(fact))
      }

      // Logical reading order: name → profile/summary → work history.
      const name = flat.indexOf(squash('Elena Marchetti'))
      const summary = flat.indexOf(squash('curating wine programs'))
      const job = flat.indexOf(squash('Maison Laurent'))
      expect(name).toBeGreaterThanOrEqual(0)
      expect(name).toBeLessThan(job)
      expect(summary).toBeLessThan(job)

      // Only the CV prints — none of the editor.
      for (const ui of ['Download PDF', 'Customize', 'Target job ad', 'Personal details', 'Import CV']) {
        expect(flat, `${id} PDF must not contain builder UI "${ui}"`).not.toContain(squash(ui))
      }
    })
  }
})
