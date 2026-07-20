import { describe, it, expect } from 'vitest'
import { TEMPLATES } from '@/components/templates/registry'

// P2-3: At least one template must be free (premium !== true)
// so the builder has a usable free path without payment.

describe('P2-3 — free template tier exists', () => {
  it('at least one template has no premium flag (free tier)', () => {
    const freeTemplates = TEMPLATES.filter((t) => !t.premium)
    // RED before fix: all 5 templates have premium: true → freeTemplates is empty
    expect(freeTemplates.length).toBeGreaterThanOrEqual(1)
  })

  it('the first template in TEMPLATES is free', () => {
    // Decision: mark TEMPLATES[0] (Noir) as free
    expect(TEMPLATES[0].premium).toBeFalsy()
  })

  it('free template is selectable (has id, name, Component)', () => {
    const free = TEMPLATES.find((t) => !t.premium)
    expect(free).toBeDefined()
    expect(free!.id).toBeTruthy()
    expect(free!.name).toBeTruthy()
    expect(free!.Component).toBeDefined()
  })
})
