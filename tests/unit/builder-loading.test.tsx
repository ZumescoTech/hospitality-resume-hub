import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'

// P0-2: Builder must show a skeleton when `hydrated` is false.
// Fix exports a BuilderSkeleton component and renders it instead of null.
// Before the fix, BuilderSkeleton doesn't exist → second test is RED.
// We also render the skeleton directly to assert it has a visible element.

describe('P0-2 — BuilderSkeleton exists and is visible', () => {
  it('BuilderSkeleton is a named export from the builder route', async () => {
    const mod = await import('@/routes/builder')
    // RED before fix: BuilderSkeleton is not exported → undefined
    expect((mod as Record<string, unknown>).BuilderSkeleton).toBeDefined()
  })

  it('BuilderSkeleton renders a visible loading indicator with data-testid', async () => {
    const mod = await import('@/routes/builder')
    const BuilderSkeleton = (mod as Record<string, unknown>).BuilderSkeleton as React.FC
    if (!BuilderSkeleton) throw new Error('BuilderSkeleton not exported — fix not applied yet')

    render(<BuilderSkeleton />)
    expect(screen.getByTestId('builder-skeleton')).toBeDefined()
  })
})
