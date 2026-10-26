import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

// Download PDF opens the browser's print dialog over the hidden full-size copy
// of the preview (PrintableCv), so the PDF matches the preview exactly.

// ── Mocks ─────────────────────────────────────────────────────────────────────

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
vi.mock('@/components/builder/BottomCta', () => ({
  BottomCta: ({ onPress }: { onPress: () => void }) => (
    <button data-testid="download-btn" onClick={onPress}>Download</button>
  ),
}))
vi.mock('@/components/builder/PreviewPanel', () => ({ PreviewPanel: () => null }))
vi.mock('@/components/builder/StyleDrawer', () => ({ StyleDrawer: () => null }))
vi.mock('@/components/builder/MobilePreviewModal', () => ({ MobilePreviewModal: () => null }))
vi.mock('@/components/builder/sections/PersonalSection', () => ({ PersonalSection: () => null }))
vi.mock('@/components/builder/sections/ExperienceSection', () => ({ ExperienceSection: () => null }))
vi.mock('@/components/builder/sections/EducationSection', () => ({ EducationSection: () => null }))
vi.mock('@/components/builder/sections/SkillsSection', () => ({ SkillsSection: () => null }))
vi.mock('@/components/builder/sections/CertificationsSection', () => ({ CertificationsSection: () => null }))
vi.mock('@/components/builder/sections/HospitalitySection', () => ({ HospitalitySection: () => null }))
vi.mock('@/lib/extractCvText', () => ({ extractTextFromFile: vi.fn() }))
vi.mock('@/lib/parseCvForBuilder', () => ({ parseCvForBuilder: vi.fn(), enrichImportedCv: vi.fn() }))
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

describe('Download PDF prints the preview copy', () => {
  let printSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    printSpy = vi.spyOn(window, 'print').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clicking Download opens the print dialog', async () => {
    await renderBuilder()
    fireEvent.click(screen.getByTestId('download-btn'))
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('names the PDF after the candidate while printing, then restores the title', async () => {
    await renderBuilder()
    document.title = 'GetHired'
    let titleDuringPrint = ''
    printSpy.mockImplementation(() => { titleDuringPrint = document.title })

    fireEvent.click(screen.getByTestId('download-btn'))
    expect(titleDuringPrint).toBe('Jane_Doe_CV')

    window.dispatchEvent(new Event('afterprint'))
    expect(document.title).toBe('GetHired')
  })

  it('renders a hidden full-size CV copy for printing', async () => {
    await renderBuilder()
    const copy = document.querySelector('[data-testid="cv-print-root"]')
    expect(copy).not.toBeNull()
    expect(copy?.parentElement).toBe(document.body)
    expect(copy?.textContent).toContain('Jane Doe')
  })

  it('shows an error toast if the print dialog cannot open', async () => {
    const { toast } = await import('sonner')
    printSpy.mockImplementation(() => { throw new Error('blocked') })
    await renderBuilder()
    fireEvent.click(screen.getByTestId('download-btn'))
    expect(toast.error).toHaveBeenCalled()
  })
})
