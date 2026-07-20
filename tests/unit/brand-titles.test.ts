import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// P2-1: No "Plate & Pen" anywhere in source. Builder page title must be GetHired.

const src = (file: string) =>
  readFileSync(resolve(__dirname, '../../src', file), 'utf-8')

describe('P2-1 — brand title consistency', () => {
  it('builder.tsx page title starts with "GetHired"', () => {
    const builderSrc = src('routes/builder.tsx')
    // Must NOT contain "Plate & Pen" as a title
    expect(builderSrc).not.toContain('Plate & Pen')
    // Must contain the correct GetHired title
    expect(builderSrc).toContain('GetHired')
  })

  it('no "Plate & Pen" in the builder og:title', () => {
    const builderSrc = src('routes/builder.tsx')
    expect(builderSrc).not.toMatch(/og:title.*Plate/)
  })

  it('no "Plate & Pen" in cruise-cv-checker.tsx', () => {
    const checkerSrc = src('routes/tools/cruise-cv-checker.tsx')
    expect(checkerSrc).not.toContain('Plate &amp; Pen')
    expect(checkerSrc).not.toContain('Plate & Pen')
  })

  it('cruise-cv-checker.tsx page title starts with "GetHired"', () => {
    const checkerSrc = src('routes/tools/cruise-cv-checker.tsx')
    // Must follow GetHired — {page} convention
    expect(checkerSrc).toMatch(/title:\s*['"]GetHired/)
  })
})
