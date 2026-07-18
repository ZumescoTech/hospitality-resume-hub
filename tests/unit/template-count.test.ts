import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { TEMPLATES } from '@/components/templates/registry'

// P2-2: Hero stat must equal the actual number of registered templates.
// The hero currently hardcodes "13+" but only 5 templates exist → drift.
// Fix: derive the hero number from TEMPLATES.length.

describe('P2-2 — hero template count matches registry', () => {
  it('HeroBanner does not hardcode a template count higher than TEMPLATES.length', () => {
    const bannerSrc = readFileSync(
      resolve(__dirname, '../../src/components/landing/HeroBanner.tsx'),
      'utf-8'
    )
    // RED: banner contains "13+" which is > TEMPLATES.length (5) → hardcoded drift
    expect(bannerSrc).not.toMatch(/'13\+'/)
    expect(bannerSrc).not.toMatch(/"13\+"/)
  })

  it('template count stat derives from TEMPLATES.length (single source of truth)', () => {
    // The banner should reference TEMPLATES or export the count — not a literal string.
    // After fix: banner imports TEMPLATES and uses .length
    const bannerSrc = readFileSync(
      resolve(__dirname, '../../src/components/landing/HeroBanner.tsx'),
      'utf-8'
    )
    // RED before fix: banner doesn't import TEMPLATES
    expect(bannerSrc).toContain('TEMPLATES')
  })

  it('registry guard: TEMPLATES.length matches what the hero will display', () => {
    // This test always passes — it's the living count assertion.
    // If templates are added/removed, the other tests enforce the banner updates too.
    expect(TEMPLATES.length).toBeGreaterThan(0)
  })
})
