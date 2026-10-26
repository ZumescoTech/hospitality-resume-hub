import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { TailorReviewDialog, type TailorReview } from '@/components/builder/TailorReviewDialog'
import { sampleResume } from '@/types/resume'
import { applyTailoring } from '@/lib/tailor-cv'

// Job tailoring is reviewed before it applies; skills are opt-in.

const before = sampleResume
const proposed = applyTailoring(before, {
  summary: 'Cunard-ready WSET Level 3 sommelier with 9+ years and 40 awards.',
  experience: [{ id: before.experience[0].id, bullets: ['Led Micros POS wine service for 500 guests'] }],
  suggestedSkills: [],
})
const review: TailorReview = { before, proposed, suggestedSkills: ['Opera PMS', 'Micros POS'] }

describe('TailorReviewDialog', () => {
  it('shows current vs suggested text and counts [X] placeholders', () => {
    render(<TailorReviewDialog review={review} onApply={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.getByTestId('tailor-review-summary').textContent).toContain('Cunard-ready')
    expect(screen.getAllByTestId('tailor-review-entry')).toHaveLength(1)
    expect(screen.getByText(/2 figures marked \[X\]/)).toBeDefined()
  })

  it('applies only the skills the candidate ticks', () => {
    const onApply = vi.fn()
    render(<TailorReviewDialog review={review} onApply={onApply} onDiscard={vi.fn()} />)
    fireEvent.click(screen.getByLabelText('I have Opera PMS'))
    fireEvent.click(screen.getByTestId('tailor-review-apply'))
    expect(onApply).toHaveBeenCalledWith(['Opera PMS'])
  })

  it('"Keep my original" discards without applying', () => {
    const onApply = vi.fn()
    const onDiscard = vi.fn()
    render(<TailorReviewDialog review={review} onApply={onApply} onDiscard={onDiscard} />)
    fireEvent.click(screen.getByTestId('tailor-review-discard'))
    expect(onDiscard).toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('renders nothing without a review', () => {
    render(<TailorReviewDialog review={null} onApply={vi.fn()} onDiscard={vi.fn()} />)
    expect(screen.queryByTestId('tailor-review')).toBeNull()
  })
})
