import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, renderHook } from '@testing-library/react'
import React from 'react'

// Step 8 — the desktop two-pane split must come from the viewport, not from
// `activeTab` plus a `lg:block` class winning a specificity fight. These tests
// lock the decoupling and the StepProgress regression it fixed.

// ── matchMedia harness ────────────────────────────────────────────────────────
// jsdom ships a matchMedia that never matches, so the desktop branch is
// unreachable without a stub. This one evaluates a single width and lets a test
// drive a resize through the registered change listeners.

type Listener = () => void
const listeners = new Set<Listener>()
let width = 375

function installMatchMedia() {
  vi.stubGlobal('matchMedia', (query: string) => {
    const min = Number(/min-width:\s*(\d+)px/.exec(query)?.[1] ?? 0)
    return {
      get matches() { return width >= min },
      media: query,
      addEventListener: (_: string, cb: Listener) => { listeners.add(cb) },
      removeEventListener: (_: string, cb: Listener) => { listeners.delete(cb) },
      addListener: (cb: Listener) => { listeners.add(cb) },
      removeListener: (cb: Listener) => { listeners.delete(cb) },
      dispatchEvent: () => false,
      onchange: null,
    }
  })
}

function resizeTo(next: number) {
  width = next
  act(() => { listeners.forEach(cb => cb()) })
}

// ── Builder route mocks (mirrors download.test.tsx, minus StepProgress) ───────

vi.mock('@react-pdf/renderer', () => ({
  pdf: () => ({ toBlob: vi.fn() }),
  PDFDownloadLink: () => null,
  Document: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Page: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  View: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Text: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Image: () => null,
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  StyleSheet: { create: (s: unknown) => s },
  Font: { register: vi.fn(), registerHyphenationCallback: vi.fn() },
}))
vi.mock('@/lib/pdf/ResumePDF', () => ({ ResumePDF: () => null }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), loading: vi.fn(), dismiss: vi.fn() } }))
vi.mock('@/lib/resume-store', () => ({
  useResumeStore: () => ({
    data: {
      personal: { fullName: 'Jane Doe', title: 'Sommelier', email: 'jane@example.com', phone: '', location: '', photo: undefined, links: [] },
      summary: '', experience: [], education: [], skills: [], certifications: [],
      hospitality: { serviceStyles: [], posSystems: [], wineKnowledge: '', spiritsKnowledge: '', languages: [], allergens: false, foodSafety: '' },
      templateId: 'classic', formatting: undefined,
    },
    hydrated: true, syncing: false, resumeId: null,
    update: vi.fn(), setData: vi.fn(), loadSample: vi.fn(), reset: vi.fn(),
    setTemplateColours: vi.fn(), resetTemplateColours: vi.fn(),
  }),
}))
vi.mock('@/hooks/use-reveal', () => ({ useReveal: vi.fn() }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: vi.fn() } }))
vi.mock('@/hooks/use-user', () => ({ useUser: () => ({ user: null, loading: false }) }))
vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  useNavigate: () => vi.fn(),
  useSearch: () => ({}),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock('@/components/ui/AppHeader', () => ({ AppHeader: () => <div>Header</div> }))
vi.mock('@/components/builder/BottomCta', () => ({
  BottomCta: ({ mode }: { mode: string }) => <div data-testid="bottom-cta" data-mode={mode} />,
}))
vi.mock('@/components/builder/PreviewPanel', () => ({ PreviewPanel: () => <div data-testid="preview-body" /> }))
vi.mock('@/components/builder/StyleDrawer', () => ({ StyleDrawer: () => null }))
vi.mock('@/components/builder/MobilePreviewModal', () => ({ MobilePreviewModal: () => null }))
vi.mock('@/components/builder/sections/PersonalSection', () => ({ PersonalSection: () => null }))
vi.mock('@/components/builder/sections/ExperienceSection', () => ({ ExperienceSection: () => null }))
vi.mock('@/components/builder/sections/EducationSection', () => ({ EducationSection: () => null }))
vi.mock('@/components/builder/sections/SkillsSection', () => ({ SkillsSection: () => null }))
vi.mock('@/components/builder/sections/CertificationsSection', () => ({ CertificationsSection: () => null }))
vi.mock('@/components/builder/sections/HospitalitySection', () => ({ HospitalitySection: () => null }))
vi.mock('@/lib/extractCvText', () => ({ extractTextFromFile: vi.fn() }))
vi.mock('@/lib/parseCvForBuilder', () => ({ parseCvForBuilder: vi.fn() }))
vi.mock('@/lib/cv-import-handoff', () => ({ consumeCvImport: vi.fn(() => null) }))
vi.mock('@/lib/map-parsed-cv-to-builder', () => ({ mapParsedCvToBuilderForm: vi.fn() }))
vi.mock('@/components/builder/Section', () => ({
  Section: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))
vi.mock('@/components/builder/TagInput', () => ({ TagInput: () => null }))

async function renderBuilder() {
  const mod = await import('@/routes/builder')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BuilderPage = (mod.Route as any)?.options?.component as React.FC
  return render(<BuilderPage />)
}

const pillNav = () => document.querySelector('nav[aria-label="Form sections"]')
const editPane = () => document.querySelector('.builder-layout')?.children[0] as HTMLElement
const previewPane = () => document.querySelector('.preview-panel-outer') as HTMLElement

beforeEach(() => { listeners.clear(); width = 375; installMatchMedia() })
afterEach(() => { vi.unstubAllGlobals() })

// ── useIsDesktop ──────────────────────────────────────────────────────────────

describe('useIsDesktop', () => {
  it('is false below 1024px and true at/above it', async () => {
    const { useIsDesktop } = await import('@/hooks/use-is-desktop')

    width = 1023
    const { result: below } = renderHook(() => useIsDesktop())
    expect(below.current).toBe(false)

    width = 1024
    const { result: at } = renderHook(() => useIsDesktop())
    expect(at.current).toBe(true)
  })

  it('reacts to a resize across the breakpoint', async () => {
    const { useIsDesktop } = await import('@/hooks/use-is-desktop')
    width = 375
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)

    resizeTo(1280)
    expect(result.current).toBe(true)

    resizeTo(800)
    expect(result.current).toBe(false)
  })

  it('returns false when matchMedia is unavailable (SSR / old browser)', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { useIsDesktop } = await import('@/hooks/use-is-desktop')
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })
})

// ── Builder layout decoupling ────────────────────────────────────────────────

describe('Step 8 — desktop panes are viewport-driven, not activeTab-driven', () => {
  it('at >=1024px both panes render without a `hidden` class to override', async () => {
    width = 1280
    await renderBuilder()

    // The decision is isDesktop, so neither pane carries `hidden` at all —
    // there is no lg:block rescuing a hidden pane.
    expect(editPane().className).toContain('block')
    expect(editPane().className).not.toContain('hidden')
    expect(previewPane().className).toContain('block')
    expect(previewPane().className).not.toContain('hidden')
    expect(previewPane().className).not.toContain('lg:block')
    expect(screen.getByTestId('preview-body')).toBeDefined()
  })

  it('below 1024px only the active tab renders, exactly as before', async () => {
    width = 375
    await renderBuilder()

    expect(editPane().className).toContain('block')
    expect(previewPane().className).toContain('hidden')

    // Switching to Preview flips which single pane is shown.
    act(() => { screen.getByRole('tab', { name: 'Preview' }).click() })
    expect(editPane().className).toContain('hidden')
    expect(previewPane().className).toContain('block')
    expect(previewPane().className).not.toContain('hidden')
  })

  it('REGRESSION: the pill nav survives a Preview tab chosen at mobile width', async () => {
    width = 375
    await renderBuilder()
    expect(pillNav()).not.toBeNull()

    // Pick Preview while narrow — the nav correctly steps aside.
    act(() => { screen.getByRole('tab', { name: 'Preview' }).click() })
    expect(pillNav()).toBeNull()

    // Widen past the split. The switcher is unreachable at desktop, so if the
    // nav still read activeTab it would be hidden with no way back.
    resizeTo(1280)
    expect(pillNav()).not.toBeNull()

    // And narrowing again restores the mobile behaviour: still on Preview.
    resizeTo(375)
    expect(pillNav()).toBeNull()
  })

  it('leaves BottomCta driven by activeTab (review scaffolding untouched)', async () => {
    width = 1280
    await renderBuilder()
    expect(screen.getByTestId('bottom-cta').getAttribute('data-mode')).toBe('edit')
  })
})
