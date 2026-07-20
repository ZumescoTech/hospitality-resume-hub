import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { emptyResume, sampleResume } from '@/types/resume'

// --- Mock external dependencies ---

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    }),
  },
}))

vi.mock('@/hooks/use-user', () => ({
  useUser: () => ({ user: null, loading: false }),
}))

// --- Tests ---

describe('P0-3 — fresh anonymous session (no localStorage draft)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('RED → store initialises with emptyResume, not sampleResume', async () => {
    const { useResumeStore } = await import('@/lib/resume-store')
    const { result } = renderHook(() => useResumeStore())

    await waitFor(() => expect(result.current.hydrated).toBe(true))

    // After fix this should equal emptyResume; currently equals sampleResume → RED
    expect(result.current.data.personal.fullName).toBe('')
    expect(result.current.data.experience).toHaveLength(0)
  })

  it('PII guard — no sample persona tokens in hydrated state', async () => {
    const { useResumeStore } = await import('@/lib/resume-store')
    const { result } = renderHook(() => useResumeStore())

    await waitFor(() => expect(result.current.hydrated).toBe(true))

    const s = JSON.stringify(result.current.data)
    expect(s).not.toContain('Elena Marchetti')
    expect(s).not.toContain('elena.marchetti')
    expect(s).not.toContain('Maison Laurent')
    expect(s).not.toContain('Trattoria')
  })

  it('loadSample() makes sample data available on demand', async () => {
    const { useResumeStore } = await import('@/lib/resume-store')
    const { result } = renderHook(() => useResumeStore())

    await waitFor(() => expect(result.current.hydrated).toBe(true))

    // Start empty, then explicitly load sample
    expect(result.current.data.personal.fullName).toBe('')
    result.current.loadSample()
    await waitFor(() =>
      expect(result.current.data.personal.fullName).toBe(sampleResume.personal.fullName)
    )
  })
})

// emptyResume itself must contain no sample PII (bundle-level guard)
describe('P0-3 — emptyResume bundle PII guard', () => {
  it('emptyResume contains no sample persona tokens', () => {
    const s = JSON.stringify(emptyResume)
    expect(s).not.toContain('Elena Marchetti')
    expect(s).not.toContain('Maison Laurent')
    expect(s).not.toContain('Trattoria')
    expect(s).not.toContain('thabo.nkosi')
    expect(emptyResume.personal.fullName).toBe('')
    expect(emptyResume.experience).toHaveLength(0)
  })
})
