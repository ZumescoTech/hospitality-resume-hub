import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { StyleDrawer } from '@/components/builder/StyleDrawer'
import { TEMPLATES } from '@/components/templates/registry'
import { ResumeData } from '@/types/resume'

// Step 7 — the drawer is the only way into template/style choice on mobile, so
// its contract is: opens over Preview, closes from backdrop or the X, switches
// sub-tabs without closing, and pushes every selection straight to the parent
// (which is what makes the choice survive an Edit ⇄ Preview round trip).

// jsdom ships no ResizeObserver; the Radix slider inside FormattingPanel
// measures its thumb on mount.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// react-colorful reaches for layout APIs jsdom does not implement.
vi.mock('react-colorful', () => ({
  HexColorPicker: () => <div data-testid="hex-picker" />,
  HexColorInput: () => <input data-testid="hex-input" />,
}))

function makeData(overrides: Partial<ResumeData> = {}): ResumeData {
  return {
    personal: { fullName: 'Jane Doe', title: 'Sommelier', email: '', phone: '', location: '', links: [] },
    summary: '',
    experience: [],
    education: [],
    skills: [],
    certifications: [],
    hospitality: {
      serviceStyles: [], posSystems: [], wineKnowledge: 'None', spiritsKnowledge: 'None',
      languages: [], allergens: false, foodSafety: '',
    },
    // Vintage is the registry default and has no colour slots.
    templateId: 'vintage',
    ...overrides,
  } as ResumeData
}

function renderDrawer(props: Partial<React.ComponentProps<typeof StyleDrawer>> = {}) {
  const handlers = {
    onClose: vi.fn(),
    onTemplateChange: vi.fn(),
    onFormattingChange: vi.fn(),
    onColourChange: vi.fn(),
    onColourReset: vi.fn(),
  }
  const utils = render(
    <StyleDrawer isOpen data={makeData()} {...handlers} {...props} />,
  )
  return { ...utils, ...handlers }
}

describe('StyleDrawer — Step 7 bottom sheet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders nothing while closed', () => {
    renderDrawer({ isOpen: false })
    expect(screen.queryByTestId('style-drawer')).toBeNull()
  })

  it('renders the sheet and a dimmed backdrop when open', () => {
    renderDrawer()
    expect(screen.getByTestId('style-drawer')).toBeTruthy()
    expect(screen.getByTestId('style-drawer-backdrop')).toBeTruthy()
  })

  it('closes on backdrop tap and on the close button', () => {
    const { onClose } = renderDrawer()
    fireEvent.click(screen.getByTestId('style-drawer-backdrop'))
    fireEvent.click(screen.getByTestId('style-drawer-close'))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('lists every registry template and reports the selected one', () => {
    renderDrawer()
    for (const t of TEMPLATES) {
      expect(screen.getByTestId(`drawer-template-${t.id}`)).toBeTruthy()
    }
    expect(screen.getByTestId('drawer-template-vintage').getAttribute('data-selected')).toBe('true')
    expect(screen.getByTestId('drawer-template-executive').getAttribute('data-selected')).toBe('false')
  })

  it('pushes a template choice to the parent without closing', () => {
    const { onTemplateChange, onClose } = renderDrawer()
    fireEvent.click(screen.getByTestId('drawer-template-executive'))
    expect(onTemplateChange).toHaveBeenCalledWith('executive')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('style-drawer')).toBeTruthy()
  })

  it('switches sub-tabs in place — each panel renders, the sheet stays open', () => {
    const { onClose } = renderDrawer()
    expect(screen.getByTestId('style-drawer-panel-template')).toBeTruthy()

    fireEvent.click(screen.getByTestId('style-drawer-tab-format'))
    expect(screen.getByTestId('style-drawer-panel-format')).toBeTruthy()
    expect(screen.queryByTestId('style-drawer-panel-template')).toBeNull()

    fireEvent.click(screen.getByTestId('style-drawer-tab-template'))
    expect(screen.getByTestId('style-drawer-panel-template')).toBeTruthy()

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByTestId('style-drawer')).toBeTruthy()
  })

  it('marks the template the preview actually renders for a legacy id', () => {
    // A fresh draft still says "classic", which is no longer in the registry —
    // the preview falls back to TEMPLATES[0], so that card must read selected.
    renderDrawer({ data: makeData({ templateId: 'classic' }) })
    expect(
      screen.getByTestId(`drawer-template-${TEMPLATES[0].id}`).getAttribute('data-selected'),
    ).toBe('true')
  })

  it('offers the Colours tab only for templates with colour slots', () => {
    const { unmount } = renderDrawer()
    // Vintage has no colour slots — Template + Text only.
    expect(screen.queryByTestId('style-drawer-tab-colour')).toBeNull()
    unmount()

    renderDrawer({ data: makeData({ templateId: 'executive' }) })
    fireEvent.click(screen.getByTestId('style-drawer-tab-colour'))
    expect(screen.getByTestId('style-drawer-panel-colour')).toBeTruthy()
  })
})
