import { defineConfig, devices } from '@playwright/test'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // ── Desktop engines ────────────────────────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // ── Mobile device profiles (emulation only — real iOS/Android is MANUAL) ──
    {
      name: 'iphone',
      use: { ...devices['iPhone 14'] },
    },
    {
      name: 'android',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Pro 11'] },
    },
  ],
})
