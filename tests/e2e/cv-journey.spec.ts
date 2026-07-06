/**
 * CV Journey — Baseline & Assisted Pass
 *
 * For each CV in cv-tests/, runs:
 *   1. Baseline pass: upload → checker → builder → download PDF
 *   2. Assisted pass: same + invoke Tailor on first experience, download PDF
 *
 * Artifacts saved to test-results/cv-journey/<cv-name>/
 *   - baseline.pdf
 *   - assisted.pdf
 *   - checker-score.json
 *
 * Runs sequentially (not parallel) — each test makes live Groq API calls.
 * Timeout per test: 120 s.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// ── CV matrix ─────────────────────────────────────────────────────────────────

const CV_TESTS = [
  {
    file: 'cv-tests/sommelier/Innocent__Chilongo_-_Sommelier.pdf',
    role: 'sommelier-wine-waiter',
    id: 'innocent-chilongo',
  },
  {
    file: 'cv-tests/sommelier/Michelle_Rumbidzai__Gaswa_-_Sommelier.pdf',
    role: 'sommelier-wine-waiter',
    id: 'michelle-gaswa',
  },
  {
    file: 'cv-tests/sommelier/SOMMELIER.pdf',
    role: 'sommelier-wine-waiter',
    id: 'sommelier-a',
  },
  {
    file: 'cv-tests/sommelier/SOMMELIER-WINEWAITER.pdf',
    role: 'sommelier-wine-waiter',
    id: 'sommelier-winewaiter',
  },
  {
    file: 'cv-tests/sommelier/WINESTEWARD.pdf',
    role: 'sommelier-wine-waiter',
    id: 'winesteward',
  },
  {
    file: 'cv-tests/waitress/Amanda_Phiri_CV.pdf',
    role: 'waiter-waitress',
    id: 'amanda-phiri',
  },
]

const REPO_ROOT = path.resolve(__dirname, '../../')
// Keep artifacts OUTSIDE Playwright's test-results/ (Playwright cleans that dir on each run)
const ARTIFACTS_DIR = path.join(REPO_ROOT, 'cv-journey-artifacts')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function selectRole(page: import('@playwright/test').Page, roleSlug: string) {
  const firstWord = roleSlug === 'sommelier-wine-waiter' ? 'Sommelier' : 'Waiter'

  // Radix UI Select: click the trigger to open the portal dropdown, then click the option.
  // The native hidden <select> manipulation does NOT update Radix React state.
  const trigger = page.locator('[role="combobox"]').first()
  await trigger.click()
  // Give Radix portal time to mount in the DOM
  await page.waitForTimeout(600)

  // Options render in a Radix portal at the document root
  const option = page.getByRole('option', { name: new RegExp(firstWord, 'i') }).first()
  await option.waitFor({ state: 'visible', timeout: 8000 })
  await option.click()

  // Verify selection was applied
  await expect(trigger).toContainText(firstWord, { timeout: 5000 })
}

async function uploadCvFile(page: import('@playwright/test').Page, filePath: string) {
  const absPath = path.join(REPO_ROOT, filePath)
  // Set files on the hidden input directly
  const fileInput = page.locator('input[type="file"][accept*="pdf"]')
  await fileInput.setInputFiles(absPath)
  // Confirm file is staged
  await expect(page.locator('text=/ready|loaded/i').first()).toBeVisible({ timeout: 5000 })
}

async function waitForCheckerResults(page: import('@playwright/test').Page) {
  // Wait for URL to reflect results step (Groq AI call: up to 35s app-side timeout)
  await page.waitForURL(/step=results/, { timeout: 90_000 })
  // Wait for React to finish rendering the results — "Build My CV" is the definitive signal
  await page.locator('button').filter({ hasText: /Build My CV/i }).first().waitFor({ state: 'visible', timeout: 20_000 })
}

async function extractCheckerScore(page: import('@playwright/test').Page): Promise<Record<string, unknown>> {
  // Score is in img alt: "ATS score: 63 out of 100"
  // Use short timeouts — elements should already be visible from waitForCheckerResults
  const imgAlt = await page.locator('img[alt*="score"]').first().getAttribute('alt', { timeout: 3000 }).catch(() => '')
  const numMatch = imgAlt?.match(/(\d+)/)
  const score = numMatch ? parseInt(numMatch[1]) : null
  const tierText = await page.locator('text=/Strong|Good|Needs Work|Major Gaps/').first().innerText({ timeout: 3000 }).catch(() => '?')
  const headingText = await page.locator('h2').first().innerText({ timeout: 3000 }).catch(() => '')
  return { score, tier: tierText, heading: headingText, capturedAt: new Date().toISOString() }
}

async function navigateToBuilderFromChecker(page: import('@playwright/test').Page): Promise<{ parsedOk: boolean }> {
  // Button is already confirmed visible by waitForCheckerResults
  const buildBtn = page.locator('button').filter({ hasText: /Build My CV/i }).first()
  await buildBtn.click()

  // Accept EITHER /builder?from=import (parse success) or /builder (parse failed silently)
  await page.waitForURL(/\/builder/, { timeout: 15_000 })
  const url = page.url()
  const parsedOk = url.includes('from=import')

  // Wait for builder to finish loading
  await page.waitForLoadState('networkidle', { timeout: 20_000 })
  await page.waitForSelector('[data-testid="builder-skeleton"]', { state: 'detached', timeout: 15_000 }).catch(() => {})

  return { parsedOk }
}

async function downloadBuilderPdf(page: import('@playwright/test').Page, destPath: string) {
  const downloadPromise = page.waitForEvent('download', { timeout: 30_000 })
  const downloadBtn = page.getByRole('button', { name: /download/i }).first()
  await downloadBtn.waitFor({ state: 'visible', timeout: 10_000 })
  await downloadBtn.click()
  const download = await downloadPromise
  await download.saveAs(destPath)
  // Verify it's a real PDF
  const bytes = fs.readFileSync(destPath)
  expect(bytes.length).toBeGreaterThan(1024)
  expect(bytes.slice(0, 4).toString()).toBe('%PDF')
  return destPath
}

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe('CV Journey — Baseline Pass', () => {
  test.setTimeout(180_000) // 3 min: includes 90s rate-limit cooldown + 35s Groq timeout + PDF extraction
  // No describe-level retries — retries compound Groq TPM exhaustion
  // Note: run with --workers=1 to enforce sequential ordering (avoid parallel Groq calls)

  for (const cv of CV_TESTS) {
    test(`baseline: ${cv.id}`, async ({ page, context }) => {
      // Groq free tier: ~6k tokens/min effective limit per test (2 parallel calls × ~3k tokens each).
      // Wait 90s between tests to let the per-minute window fully reset.
      await new Promise(resolve => setTimeout(resolve, 90_000))

      const artifactDir = path.join(ARTIFACTS_DIR, cv.id)
      fs.mkdirSync(artifactDir, { recursive: true })

      // Fresh session
      await context.clearCookies()
      await context.addInitScript(() => localStorage.clear())

      // Capture browser errors to surface checker failures
      const browserErrors: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') browserErrors.push(msg.text())
      })

      // 1. Navigate to checker
      await page.goto('/tools/cruise-cv-checker')

      // 2. Select role
      await selectRole(page, cv.role)

      // 3. Upload CV file
      await uploadCvFile(page, cv.file)

      // 4. Submit
      await page.getByRole('button', { name: /Check My CV/i }).click()

      // 5. Wait for AI results (up to 90s including file extraction + Groq)
      await waitForCheckerResults(page).catch(err => {
        if (browserErrors.length) console.log('[BROWSER ERRORS]', browserErrors.join(' | '))
        throw err
      })

      // 6. Capture score
      const score = await extractCheckerScore(page)
      fs.writeFileSync(path.join(artifactDir, 'checker-score.json'), JSON.stringify(score, null, 2))

      // 7. Navigate to builder via "Build My CV"
      const { parsedOk } = await navigateToBuilderFromChecker(page)

      // 8. Download baseline PDF
      await downloadBuilderPdf(page, path.join(artifactDir, 'baseline.pdf'))

      // Confirm builder has parsed content (name field not empty)
      const nameVal = await page.getByTestId('input-fullname').inputValue().catch(() => '')
      fs.writeFileSync(
        path.join(artifactDir, 'baseline-meta.json'),
        JSON.stringify({ nameInBuilder: nameVal, parsedOk, cv: cv.id, role: cv.role, score }, null, 2)
      )
    })
  }
})

test.describe('CV Journey — Assisted Pass', () => {
  test.setTimeout(180_000)

  for (const cv of CV_TESTS) {
    test(`assisted: ${cv.id}`, async ({ page, context }) => {
      const artifactDir = path.join(ARTIFACTS_DIR, cv.id)
      fs.mkdirSync(artifactDir, { recursive: true })

      // Fresh session
      await context.clearCookies()
      await context.addInitScript(() => localStorage.clear())

      // 1–7: same as baseline pass
      await page.goto('/tools/cruise-cv-checker')
      await selectRole(page, cv.role)
      await uploadCvFile(page, cv.file)
      await page.getByRole('button', { name: /Check My CV/i }).click()
      await waitForCheckerResults(page)
      await navigateToBuilderFromChecker(page)

      // 8. Attempt to invoke Tailor on the first experience entry
      // Look for tailor/AI-assist buttons in the experience section
      const tailorBtn = page.getByRole('button', { name: /tailor|improve|enhance/i }).first()
      const hasTailor = await tailorBtn.isVisible().catch(() => false)

      if (hasTailor) {
        await tailorBtn.click()
        // Wait for AI response (tailorContentFn: up to 15s)
        await page.waitForTimeout(8_000)
        // Accept suggestion if a dialog/toast with an accept button appears
        const acceptBtn = page.getByRole('button', { name: /accept|apply|use this/i }).first()
        if (await acceptBtn.isVisible().catch(() => false)) {
          await acceptBtn.click()
        }
      }

      // Also try Writing Check on the first experience description textarea
      const checkWritingBtn = page.getByRole('button', { name: /check writing|grammar|spelling/i }).first()
      if (await checkWritingBtn.isVisible().catch(() => false)) {
        await checkWritingBtn.click()
        await page.waitForTimeout(4_000)
        // Accept any suggestions
        const applyBtn = page.getByRole('button', { name: /apply all|accept/i }).first()
        if (await applyBtn.isVisible().catch(() => false)) await applyBtn.click()
      }

      // 9. Download assisted PDF
      await downloadBuilderPdf(page, path.join(artifactDir, 'assisted.pdf'))

      // Record whether AI assist was actually invoked
      fs.writeFileSync(
        path.join(artifactDir, 'assisted-meta.json'),
        JSON.stringify({ tailorInvoked: hasTailor, cv: cv.id, capturedAt: new Date().toISOString() }, null, 2)
      )
    })
  }
})
