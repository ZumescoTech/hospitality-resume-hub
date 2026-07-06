/**
 * Debug spec — understand checker URL and timing
 */
import { test, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '../../')

test.setTimeout(120_000)

test('debug: checker flow with URL logging', async ({ page, context }) => {
  await context.clearCookies()
  await context.addInitScript(() => localStorage.clear())

  // Log every URL change
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log(`[NAV] ${Date.now()} → ${frame.url()}`)
    }
  })

  const t0 = Date.now()
  console.log(`[T+0] goto checker`)
  await page.goto('/tools/cruise-cv-checker')
  console.log(`[T+${Date.now()-t0}ms] page loaded`)

  // Capture browser console and page errors
  page.on('console', msg => {
    if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`)
  })
  page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))
  page.on('response', resp => {
    if (!resp.ok() && resp.url().includes('localhost')) {
      console.log(`[RESPONSE ${resp.status()}] ${resp.url()}`)
    }
  })

  // Select role via Radix click
  const trigger = page.locator('[role="combobox"]').first()
  await trigger.click()
  await page.waitForTimeout(600)
  const option = page.getByRole('option', { name: /Sommelier/i }).first()
  await option.waitFor({ state: 'visible', timeout: 5000 })
  await option.click()
  console.log(`[T+${Date.now()-t0}ms] role set`)

  // Verify role selected
  const comboText = await page.locator('[role="combobox"]').first().innerText()
  console.log(`[T+${Date.now()-t0}ms] combobox text: "${comboText}"`)

  // Upload file
  const filePath = path.join(REPO_ROOT, 'cv-tests/sommelier/Innocent__Chilongo_-_Sommelier.pdf')
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(filePath)
  console.log(`[T+${Date.now()-t0}ms] file set`)

  // Check current URL before submit
  console.log(`[T+${Date.now()-t0}ms] URL before submit: ${page.url()}`)

  // Click submit
  await page.getByRole('button', { name: /Check My CV/i }).click()
  console.log(`[T+${Date.now()-t0}ms] submitted`)

  // Poll URL every 2s for up to 60s
  let urlMatched = false
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000)
    const url = page.url()
    console.log(`[T+${Date.now()-t0}ms] URL: ${url}`)
    if (url.includes('step=results')) {
      urlMatched = true
      console.log(`[T+${Date.now()-t0}ms] URL MATCHED step=results!`)
      break
    }
  }

  if (!urlMatched) {
    console.log(`[T+${Date.now()-t0}ms] URL never matched step=results in 60s`)
    // Check what's on the page
    const bodyText = await page.locator('body').innerText()
    console.log('Body text snippet:', bodyText.slice(0, 500))
    throw new Error('URL did not change to step=results')
  }

  // Log all buttons
  const buttons = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button')).map(b => `"${b.textContent?.trim()}"`)
  )
  console.log(`[T+${Date.now()-t0}ms] Buttons: ${buttons.join(', ')}`)

  // Try to find Build My CV button
  const buildBtnCount = await page.locator('button').filter({ hasText: /Build My CV/i }).count()
  console.log(`[T+${Date.now()-t0}ms] Build My CV buttons found: ${buildBtnCount}`)
})
