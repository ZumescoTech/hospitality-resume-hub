import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { PreviewPanel } from '@/components/builder/PreviewPanel'
import { sampleResume } from '@/types/resume'

// Preview toolbar: Customize sits at the top, Download PDF prints the
// preview, and the old whole-page print icon is gone.

// jsdom ships no ResizeObserver; PreviewPanel measures its viewport with one.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

afterEach(() => vi.restoreAllMocks())

describe('PreviewPanel toolbar', () => {
  it('shows Customize at the top and opens the drawer', () => {
    const onOpenCustomize = vi.fn()
    render(<PreviewPanel data={sampleResume} onOpenCustomize={onOpenCustomize} customizeOpen={false} />)
    const btn = screen.getByTestId('toolbar-customize-btn')
    expect(btn.textContent).toContain('Customize')
    fireEvent.click(btn)
    expect(onOpenCustomize).toHaveBeenCalledTimes(1)
  })

  it('no longer has the whole-page print icon', () => {
    render(<PreviewPanel data={sampleResume} />)
    expect(screen.queryByLabelText('Print visual template')).toBeNull()
  })

  it('Download PDF opens the print dialog named after the candidate', () => {
    let title = ''
    vi.spyOn(window, 'print').mockImplementation(() => { title = document.title })
    render(<PreviewPanel data={sampleResume} />)
    fireEvent.click(screen.getByTestId('download-pdf-btn'))
    expect(window.print).toHaveBeenCalledTimes(1)
    expect(title).toBe(`${sampleResume.personal.fullName.replace(/\s+/g, '_')}_CV`)
  })
})
