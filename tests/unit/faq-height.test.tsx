import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// P2-4: FAQ accordion panels must not use a fixed max-height that clips content.
// The current `max-h-48` (192px) truncates long answers at mobile widths.
// Fix: replace with max-h-none or a large enough dynamic value.

describe('P2-4 — FAQ accordion has no clipping max-height', () => {
  const indexSrc = readFileSync(
    resolve(__dirname, '../../src/routes/index.tsx'),
    'utf-8'
  )

  it('FaqItem does not use max-h-48 (clips long answers)', () => {
    // RED: currently uses max-h-48 → answer text clips at 192px
    expect(indexSrc).not.toContain('max-h-48')
  })

  it('FaqItem open state uses max-h-none or a large non-clipping value', () => {
    // After fix: open state should use max-h-none (or ≥ max-h-[600px])
    // We check that a non-clipping open class is used
    const hasNone = indexSrc.includes('max-h-none')
    const hasLarge = /max-h-\[(?:[5-9]\d{2,}|\d{4,})px\]/.test(indexSrc)
    expect(hasNone || hasLarge).toBe(true)
  })
})
