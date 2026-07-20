import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// P1-1: /pricing footer link must not exist until the page is built.
// RED before fix: the link is present in index.tsx → grep finds it.
// GREEN after fix: the link is removed → grep finds nothing.

describe('P1-1 — no dead /pricing link in footer', () => {
  const indexSrc = readFileSync(
    resolve(__dirname, '../../src/routes/index.tsx'),
    'utf-8'
  )

  it('footer does not contain a link to /pricing', () => {
    // RED: currently contains `to="/pricing"` → this assertion fails
    expect(indexSrc).not.toMatch(/to="\/pricing"/)
  })

  it('footer does not contain any text referencing "Pricing" as a nav link', () => {
    // Guard against a plain <a href="/pricing"> alternative
    expect(indexSrc).not.toMatch(/href=["']\/pricing["']/)
  })
})
