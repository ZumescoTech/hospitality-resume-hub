import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PersonalSection } from '@/components/builder/sections/PersonalSection'
import { sampleResume } from '@/types/resume'

// "Customise CV to this job" sits directly under the Target job ad field and
// tailors the CV to the pasted ad.

const JOB_AD = 'Head Sommelier for a Cunard ship. WSET Level 3 and Micros POS required.'

describe('PersonalSection — Customise CV to this job', () => {
  it('renders below the Target job ad field and triggers tailoring', () => {
    const onTailorToJob = vi.fn()
    render(
      <PersonalSection
        data={{ ...sampleResume, targetJobDescription: JOB_AD }}
        onChange={vi.fn()}
        onTailorToJob={onTailorToJob}
      />,
    )
    const btn = screen.getByTestId('personal-customize-btn')
    const jobAd = screen.getByPlaceholderText(/Paste the job ad here/)
    expect(jobAd.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(btn.className).toContain('bg-emerald-600')

    fireEvent.click(btn)
    expect(onTailorToJob).toHaveBeenCalledTimes(1)
  })

  it('is disabled until a job ad is pasted', () => {
    render(<PersonalSection data={{ ...sampleResume, targetJobDescription: '' }} onChange={vi.fn()} onTailorToJob={vi.fn()} />)
    expect((screen.getByTestId('personal-customize-btn') as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Paste a job ad above/)).toBeDefined()
  })

  it('shows a busy state while tailoring', () => {
    render(
      <PersonalSection
        data={{ ...sampleResume, targetJobDescription: JOB_AD }}
        onChange={vi.fn()}
        onTailorToJob={vi.fn()}
        tailoring
      />,
    )
    const btn = screen.getByTestId('personal-customize-btn') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.textContent).toContain('Customising your CV')
  })

  it('is hidden when no handler is passed', () => {
    render(<PersonalSection data={sampleResume} onChange={vi.fn()} />)
    expect(screen.queryByTestId('personal-customize-btn')).toBeNull()
  })
})
