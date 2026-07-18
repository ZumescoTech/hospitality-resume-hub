# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-checker.spec.ts >> debug: checker flow with URL logging
- Location: tests\e2e\debug-checker.spec.ts:14:1

# Error details

```
Error: URL did not change to step=results
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - banner [ref=e3]:
      - generic [ref=e4]:
        - link "GetHired" [ref=e5] [cursor=pointer]:
          - /url: /
          - generic [ref=e8]: GetHired
        - link "Build CV" [ref=e9] [cursor=pointer]:
          - /url: /builder
          - button "Build CV" [ref=e10]
    - main [ref=e11]:
      - generic [ref=e12]:
        - generic [ref=e13]:
          - img [ref=e14]
          - generic [ref=e17]: Free CV Checker
        - heading "Is Your CV Cruise-Ready?" [level=1] [ref=e18]:
          - text: Is Your CV
          - text: Cruise-Ready?
        - paragraph [ref=e19]: AI analysis against real cruise recruiter standards. Know exactly what's missing before you apply.
      - generic [ref=e20]:
        - generic [ref=e21]:
          - generic [ref=e22]: Role you're applying for *
          - combobox "Role you're applying for *" [ref=e23]:
            - generic: Sommelier / Wine Waiter
            - img [ref=e24]
          - combobox [ref=e26]
        - generic [ref=e27]:
          - generic [ref=e28]: Your CV *
          - generic [ref=e29]:
            - button "Upload CV (.pdf, .docx, .txt)" [ref=e30]:
              - img [ref=e31]
              - text: Upload CV (.pdf, .docx, .txt)
            - generic [ref=e34]: CV loaded ✓
            - generic [ref=e35]: max 5 MB
        - generic [ref=e36]:
          - generic [ref=e37]: Job description (optional)
          - textbox "Job description (optional)" [ref=e38]:
            - /placeholder: Paste the job description here to improve keyword matching accuracy for this specific role…
          - paragraph [ref=e39]: If pasted, any skills mentioned in the job ad that appear in your CV will be highlighted as matched keywords.
        - button "Check My CV" [ref=e40]
        - paragraph [ref=e43]: Couldn't process file
  - region "Notifications alt+T"
```

# Test source

```ts
  1   | /**
  2   |  * Debug spec — understand checker URL and timing
  3   |  */
  4   | import { test, expect } from '@playwright/test'
  5   | import path from 'path'
  6   | import { fileURLToPath } from 'url'
  7   | 
  8   | const __filename = fileURLToPath(import.meta.url)
  9   | const __dirname = path.dirname(__filename)
  10  | const REPO_ROOT = path.resolve(__dirname, '../../')
  11  | 
  12  | test.setTimeout(120_000)
  13  | 
  14  | test('debug: checker flow with URL logging', async ({ page, context }) => {
  15  |   await context.clearCookies()
  16  |   await context.addInitScript(() => localStorage.clear())
  17  | 
  18  |   // Log every URL change
  19  |   page.on('framenavigated', (frame) => {
  20  |     if (frame === page.mainFrame()) {
  21  |       console.log(`[NAV] ${Date.now()} → ${frame.url()}`)
  22  |     }
  23  |   })
  24  | 
  25  |   const t0 = Date.now()
  26  |   console.log(`[T+0] goto checker`)
  27  |   await page.goto('/tools/cruise-cv-checker')
  28  |   console.log(`[T+${Date.now()-t0}ms] page loaded`)
  29  | 
  30  |   // Capture browser console and page errors
  31  |   page.on('console', msg => {
  32  |     if (msg.type() === 'error') console.log(`[BROWSER ERROR] ${msg.text()}`)
  33  |   })
  34  |   page.on('pageerror', err => console.log(`[PAGE ERROR] ${err.message}`))
  35  |   page.on('response', resp => {
  36  |     if (!resp.ok() && resp.url().includes('localhost')) {
  37  |       console.log(`[RESPONSE ${resp.status()}] ${resp.url()}`)
  38  |     }
  39  |   })
  40  | 
  41  |   // Select role via Radix click. Clicks that land before React hydration are
  42  |   // silently lost on this server-rendered page — retry until options render.
  43  |   const trigger = page.locator('[role="combobox"]').first()
  44  |   const option = page.getByRole('option', { name: /Sommelier/i }).first()
  45  |   await expect(async () => {
  46  |     await trigger.click()
  47  |     await expect(option).toBeVisible({ timeout: 1500 })
  48  |   }).toPass({ timeout: 20_000 })
  49  |   await option.click()
  50  |   console.log(`[T+${Date.now()-t0}ms] role set`)
  51  | 
  52  |   // Verify role selected
  53  |   const comboText = await page.locator('[role="combobox"]').first().innerText()
  54  |   console.log(`[T+${Date.now()-t0}ms] combobox text: "${comboText}"`)
  55  | 
  56  |   // Upload file
  57  |   const filePath = path.join(REPO_ROOT, 'cv-tests/sommelier/Innocent__Chilongo_-_Sommelier.pdf')
  58  |   const fileInput = page.locator('input[type="file"]')
  59  |   await fileInput.setInputFiles(filePath)
  60  |   console.log(`[T+${Date.now()-t0}ms] file set`)
  61  | 
  62  |   // Check current URL before submit
  63  |   console.log(`[T+${Date.now()-t0}ms] URL before submit: ${page.url()}`)
  64  | 
  65  |   // Click submit
  66  |   await page.getByRole('button', { name: /Check My CV/i }).click()
  67  |   console.log(`[T+${Date.now()-t0}ms] submitted`)
  68  | 
  69  |   // Poll URL every 2s for up to 60s
  70  |   let urlMatched = false
  71  |   for (let i = 0; i < 30; i++) {
  72  |     await page.waitForTimeout(2000)
  73  |     const url = page.url()
  74  |     console.log(`[T+${Date.now()-t0}ms] URL: ${url}`)
  75  |     if (url.includes('step=results')) {
  76  |       urlMatched = true
  77  |       console.log(`[T+${Date.now()-t0}ms] URL MATCHED step=results!`)
  78  |       break
  79  |     }
  80  |   }
  81  | 
  82  |   if (!urlMatched) {
  83  |     console.log(`[T+${Date.now()-t0}ms] URL never matched step=results in 60s`)
  84  |     // Check what's on the page
  85  |     const bodyText = await page.locator('body').innerText()
  86  |     console.log('Body text snippet:', bodyText.slice(0, 500))
> 87  |     throw new Error('URL did not change to step=results')
      |           ^ Error: URL did not change to step=results
  88  |   }
  89  | 
  90  |   // Log all buttons
  91  |   const buttons = await page.evaluate(() =>
  92  |     Array.from(document.querySelectorAll('button')).map(b => `"${b.textContent?.trim()}"`)
  93  |   )
  94  |   console.log(`[T+${Date.now()-t0}ms] Buttons: ${buttons.join(', ')}`)
  95  | 
  96  |   // Try to find Build My CV button
  97  |   const buildBtnCount = await page.locator('button').filter({ hasText: /Build My CV/i }).count()
  98  |   console.log(`[T+${Date.now()-t0}ms] Build My CV buttons found: ${buildBtnCount}`)
  99  | })
  100 | 
```