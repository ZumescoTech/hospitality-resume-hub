import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, act } from '@testing-library/react'
import React from 'react'

// P0-1: Tests for src/hooks/use-reveal.ts
// RED before fix: the file doesn't exist → import throws
// GREEN after fix: hook exported with fallback logic

// Helper component that uses the hook under test
async function makeRevealComponent() {
  const { useReveal } = await import('@/hooks/use-reveal')
  function TestReveal() {
    useReveal()
    return (
      <div>
        <div className="gh-reveal" data-testid="el-1">Content 1</div>
        <div className="gh-reveal gh-d2" data-testid="el-2">Content 2</div>
        <div className="gh-reveal-left" data-testid="el-3">Content 3</div>
      </div>
    )
  }
  return TestReveal
}

describe('P0-1 — useReveal hook: IntersectionObserver path', () => {
  let observerCallback: IntersectionObserverCallback
  let observedElements: Element[]

  beforeEach(() => {
    observedElements = []
    function MockObserver(cb: IntersectionObserverCallback) {
      observerCallback = cb
      this.observe = (el: Element) => observedElements.push(el)
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', MockObserver)
    vi.stubGlobal('innerHeight', 768)
    // Elements are below the viewport at mount → must be observed, not immediately revealed
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 900, bottom: 1000, left: 0, right: 100, width: 100, height: 100, x: 0, y: 900, toJSON: () => {},
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('observes all .gh-reveal and .gh-reveal-left elements', async () => {
    const TestReveal = await makeRevealComponent()
    await act(async () => { render(<TestReveal />) })
    expect(observedElements.length).toBe(3)
  })

  it('adds gh-visible when observer fires with isIntersecting=true', async () => {
    const TestReveal = await makeRevealComponent()
    const { getByTestId } = render(<TestReveal />)
    const el1 = getByTestId('el-1')

    await act(async () => {
      observerCallback(
        [{ isIntersecting: true, target: el1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(el1.classList.contains('gh-visible')).toBe(true)
  })

  it('does NOT add gh-visible when isIntersecting=false', async () => {
    const TestReveal = await makeRevealComponent()
    const { getByTestId } = render(<TestReveal />)
    const el1 = getByTestId('el-1')

    await act(async () => {
      observerCallback(
        [{ isIntersecting: false, target: el1 } as IntersectionObserverEntry],
        {} as IntersectionObserver
      )
    })

    expect(el1.classList.contains('gh-visible')).toBe(false)
  })
})

describe('P0-1 — useReveal hook: no-observer fallback (critical release rule)', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', undefined)
    vi.stubGlobal('innerHeight', 768)
  })
  afterEach(() => { vi.unstubAllGlobals() })

  it('reveals ALL elements immediately when IntersectionObserver is unavailable', async () => {
    const TestReveal = await makeRevealComponent()
    const { getByTestId } = render(<TestReveal />)
    await act(async () => {})
    expect(getByTestId('el-1').classList.contains('gh-visible')).toBe(true)
    expect(getByTestId('el-2').classList.contains('gh-visible')).toBe(true)
    expect(getByTestId('el-3').classList.contains('gh-visible')).toBe(true)
  })
})

describe('P0-1 — useReveal hook: in-viewport fallback at mount', () => {
  beforeEach(() => {
    function MockObserver() {
      this.observe = vi.fn()
      this.unobserve = vi.fn()
      this.disconnect = vi.fn()
    }
    vi.stubGlobal('IntersectionObserver', MockObserver)
    vi.stubGlobal('innerHeight', 768)
    // All elements already IN the viewport
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      top: 100, bottom: 200, left: 0, right: 100, width: 100, height: 100, x: 0, y: 100, toJSON: () => {},
    }))
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('reveals elements in-viewport at mount without waiting for scroll', async () => {
    const TestReveal = await makeRevealComponent()
    const { getByTestId } = render(<TestReveal />)
    await act(async () => {})
    expect(getByTestId('el-1').classList.contains('gh-visible')).toBe(true)
    expect(getByTestId('el-2').classList.contains('gh-visible')).toBe(true)
    expect(getByTestId('el-3').classList.contains('gh-visible')).toBe(true)
  })
})
