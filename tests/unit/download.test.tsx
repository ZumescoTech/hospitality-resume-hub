import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'

// P0-4: Download must call pdf() from @react-pdf/renderer, show loading state,
// trigger a file download, and surface an error toast on failure.
// RED before fix: handleDownload uses the hidden-link approach, not pdf() → these tests fail.

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockToBlob = vi.fn()
const mockPdf = vi.fn(() => ({ toBlob: mockToBlob }))

vi.mock('@react-pdf/renderer', () => ({
  pdf: mockPdf,
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

// Mock all store / router deps so we can import the builder route
vi.mock('@/lib/resume-store', () => ({
  useResumeStore: () => ({
    data: {
      personal: { fullName: 'Jane Doe', title: 'Sommelier', email: 'jane@example.com', phone: '', location: '', photo: undefined, links: [] },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: [],
      hospitality: { serviceStyles: [], posSystems: [], wineKnowledge: '', spiritsKnowledge: '', languages: [], allergens: false, foodSafety: '' },
      templateId: 'classic',
      formatting: undefined,
    },
    hydrated: true,
    syncing: false,
    resumeId: null,
    update: vi.fn(),
    setData: vi.fn(),
    loadSample: vi.fn(),
    reset: vi.fn(),
    setTemplateColours: vi.fn(),
    resetTemplateColours: vi.fn(),
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
vi.mock('@/components/builder/StepProgress', () => ({ StepProgress: () => null }))
vi.mock('@/components/builder/BottomNav', () => ({
  BottomNav: ({ onDownload }: { onDownload: () => void }) => (
    <button data-testid="download-btn" onClick={onDownload}>Download</button>
  ),
}))
vi.mock('@/components/builder/TemplatesPanel', () => ({ TemplatesPanel: () => null }))
vi.mock('@/components/builder/PreviewPanel', () => ({ PreviewPanel: () => null }))
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

// ── Helpers ────────────────────────────────────────────────────────────────────

async function renderBuilder() {
  const mod = await import('@/routes/builder')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const BuilderPage = (mod.Route as any)?.options?.component as React.FC ?? (() => <div>no component</div>)
  return render(<BuilderPage />)
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('P0-4 — Download button calls pdf() and triggers file download', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful blob generation
    const fakeBlob = new Blob(['%PDF-1.4 fake'], { type: 'application/pdf' })
    mockToBlob.mockResolvedValue(fakeBlob)
    // Spy on URL methods without replacing the constructor
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://localhost/fake-pdf')
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('RED → clicking Download calls pdf() from @react-pdf/renderer', async () => {
    await renderBuilder()
    const btn = screen.getByTestId('download-btn')

    fireEvent.click(btn)
    await waitFor(() => {
      // After fix: pdf() is called. Before fix: hidden-link approach used → pdf() never called → RED
      expect(mockPdf).toHaveBeenCalled()
    }, { timeout: 2000 })
  })

  it('RED → clicking Download shows a loading state (data-testid="pdf-loading")', async () => {
    // Slow the blob so we can catch the loading state
    let resolveBlob!: (b: Blob) => void
    mockToBlob.mockReturnValue(new Promise<Blob>(r => { resolveBlob = r }))

    await renderBuilder()
    fireEvent.click(screen.getByTestId('download-btn'))

    // Loading indicator must appear while PDF is generating
    await waitFor(() => {
      expect(screen.getByTestId('pdf-loading')).toBeDefined()
    }, { timeout: 1000 })

    // Resolve the blob to clean up
    resolveBlob(new Blob(['%PDF'], { type: 'application/pdf' }))
  })

  it('RED → on pdf() failure, shows an error toast (not silent)', async () => {
    const { toast } = await import('sonner')
    mockToBlob.mockRejectedValue(new Error('PDF generation failed'))

    await renderBuilder()
    fireEvent.click(screen.getByTestId('download-btn'))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled()
    }, { timeout: 2000 })
  })
})
