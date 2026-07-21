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

// Step 8 — at >=1024px the drawer belongs to the preview pane, not the viewport.
describe('StyleDrawer — contained mode (Step 8)', () => {
  it('portals to <body> and claims aria-modal when uncontained', () => {
    const { container } = renderDrawer()
    const root = screen.getByTestId('style-drawer-root')

    // Portalled: it is not inside the render container.
    expect(container.contains(root)).toBe(false)
    expect(document.body.contains(root)).toBe(true)
    expect(root.getAttribute('data-contained')).toBe('false')
    expect(root.className).not.toContain('style-drawer--contained')
    expect(screen.getByTestId('style-drawer').getAttribute('aria-modal')).toBe('true')
  })

  it('stays in the tree and drops aria-modal when contained', () => {
    const { container } = renderDrawer({ contained: true })
    const root = screen.getByTestId('style-drawer-root')

    // In-tree: only then does `absolute` resolve against the preview pane.
    expect(container.contains(root)).toBe(true)
    expect(root.getAttribute('data-contained')).toBe('true')
    expect(root.className).toContain('style-drawer--contained')

    // The editor pane beside it stays usable, so it is not a modal dialog.
    expect(screen.getByTestId('style-drawer').getAttribute('aria-modal')).toBeNull()
  })

  it('keeps its full behaviour contract in contained mode', () => {
    const { onClose, onTemplateChange } = renderDrawer({
      contained: true,
      data: makeData({ templateId: 'executive' }),
    })

    // Sub-tabs still switch in place.
    fireEvent.click(screen.getByTestId('style-drawer-tab-colour'))
    expect(screen.getByTestId('style-drawer-panel-colour')).toBeTruthy()
    expect(screen.getByTestId('style-drawer')).toBeTruthy()

    // Selection still pushes to the parent without closing.
    fireEvent.click(screen.getByTestId('style-drawer-tab-template'))
    fireEvent.click(screen.getByTestId(`drawer-template-${TEMPLATES[0].id}`))
    expect(onTemplateChange).toHaveBeenCalledWith(TEMPLATES[0].id)
    expect(onClose).not.toHaveBeenCalled()

    // Backdrop still closes.
    fireEvent.click(screen.getByTestId('style-drawer-backdrop'))
    expect(onClose).toHaveBeenCalled()
  })
})
