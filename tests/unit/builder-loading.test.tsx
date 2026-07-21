import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// P0-2: Builder must show a skeleton when `hydrated` is false.
// Fix exports a BuilderSkeleton component and renders it instead of null.
// Before the fix, BuilderSkeleton doesn't exist → second test is RED.
// We also render the skeleton directly to assert it has a visible element.

// Unlike the other builder tests, this file imports the route with nothing
// mocked, so the import pulls in @react-pdf/renderer and pdfjs for real —
// ~5-6s cold. That overruns vitest's 5s default whenever the suite is under
// parallel load, which reads as a failure of a test that is really just slow.
const IMPORT_TIMEOUT = 20_000

describe('P0-2 — BuilderSkeleton exists and is visible', () => {
  it('BuilderSkeleton is a named export from the builder route', async () => {
    const mod = await import('@/routes/builder')
    // RED before fix: BuilderSkeleton is not exported → undefined
    expect((mod as Record<string, unknown>).BuilderSkeleton).toBeDefined()
  }, IMPORT_TIMEOUT)

  it('BuilderSkeleton renders a visible loading indicator with data-testid', async () => {
    const mod = await import('@/routes/builder')
    const BuilderSkeleton = (mod as Record<string, unknown>).BuilderSkeleton as React.FC
    if (!BuilderSkeleton) throw new Error('BuilderSkeleton not exported — fix not applied yet')

    render(<BuilderSkeleton />)
    expect(screen.getByTestId('builder-skeleton')).toBeDefined()
  }, IMPORT_TIMEOUT)
})
