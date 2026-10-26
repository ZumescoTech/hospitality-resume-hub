import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PersonalSection } from '@/components/builder/sections/PersonalSection'
import { sampleResume } from '@/types/resume'

// "Customise your CV" sits directly under the Target job ad field.

describe('PersonalSection Customise button', () => {
  it('renders below the Target job ad field and opens Customize', () => {
    const onOpenCustomize = vi.fn()
    render(<PersonalSection data={sampleResume} onChange={vi.fn()} onOpenCustomize={onOpenCustomize} />)

    const btn = screen.getByTestId('personal-customize-btn')
    const jobAd = screen.getByPlaceholderText(/Paste the job ad here/)
    expect(jobAd.compareDocumentPosition(btn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    fireEvent.click(btn)
    expect(onOpenCustomize).toHaveBeenCalledTimes(1)
  })

  it('is hidden when no handler is passed', () => {
    render(<PersonalSection data={sampleResume} onChange={vi.fn()} />)
    expect(screen.queryByTestId('personal-customize-btn')).toBeNull()
  })
})
