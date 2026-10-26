import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { AtsScoreRing } from '@/components/checker/AtsScoreRing'
import { HospitalitySection } from '@/components/builder/sections/HospitalitySection'
import { emptyResume } from '@/types/resume'
import { CV_EXTRACT_SYSTEM_PROMPT } from '@/lib/ai/extract-prompt'

// jsdom has no matchMedia; AtsScoreRing checks prefers-reduced-motion.
window.matchMedia ??= ((query: string) => ({
  matches: true, media: query, onchange: null,
  addListener: () => {}, removeListener: () => {},
  addEventListener: () => {}, removeEventListener: () => {}, dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia

// MVP brief §3B: the score is an internal readiness indicator, and
// "not mentioned" is never presented as "does not possess".

describe('score labelling', () => {
  it('labels the score as CV readiness and explains it is not an official ATS score', () => {
    render(<AtsScoreRing score={72} topFixes={[]} />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('CV readiness score: 72')
    expect(screen.queryByText('ATS Score')).toBeNull()
    const explainer = screen.getByTestId('score-explainer').textContent ?? ''
    expect(explainer).toContain("not a cruise line's official ATS score")
    expect(explainer).toContain('prediction of being hired')
  })
})

describe('"not mentioned" is not "does not have"', () => {
  it('builder shows "Not stated" instead of "None" for unset wine/spirits knowledge', () => {
    render(<HospitalitySection data={emptyResume} onChange={() => {}} />)
    expect(screen.getAllByText('Not stated').length).toBeGreaterThanOrEqual(2)
    expect(screen.queryByText('None')).toBeNull()
  })

  it('extraction prompt defines "None" as not stated, never as lacking', () => {
    expect(CV_EXTRACT_SYSTEM_PROMPT).toContain('"None" means NOT STATED')
    expect(CV_EXTRACT_SYSTEM_PROMPT).toContain('never infer that the candidate lacks it')
  })
})
