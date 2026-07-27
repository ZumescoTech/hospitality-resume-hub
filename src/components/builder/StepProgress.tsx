import { useEffect, useRef, useState } from 'react'

interface SectionDef {
  id: string
  label: string
}

interface Props {
  sections: SectionDef[]
  activeTab: string
  /** Called when a pill is clicked — parent should open the matching accordion */
  onSectionOpen?: (id: string) => void
  /**
   * rootMargin top offset in px. When omitted it is measured from the sticky
   * chrome (header height + this bar's own height) so it tracks --progress-h
   * across the 1024px breakpoint; pass a number only to override.
   */
  topOffset?: number
}

// Fallback when the bar height cannot be measured (SSR / jsdom): header 52 +
// desktop bar 40. The browser path measures the real value instead.
const FALLBACK_OFFSET = 92

export function StepProgress({ sections, activeTab, onSectionOpen, topOffset }: Props) {
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? '')
  const navRef = useRef<HTMLElement>(null)

  // IntersectionObserver: highlight pill as user scrolls through sections
  useEffect(() => {
    if (activeTab !== 'edit') return

    let observers: IntersectionObserver[] = []

    // The offset is everything pinned above the scrolling sections: the header
    // plus this pill bar. Measured live rather than hardcoded, because the bar
    // is 40px at >=1024px and 45px below it (--progress-h) — a fixed 92 was 5px
    // short on mobile, marking a section active slightly before it cleared the
    // bar. Re-run on resize so crossing the breakpoint re-measures.
    const setup = () => {
      observers.forEach(o => o.disconnect())
      observers = []

      let offset = topOffset
      if (offset == null) {
        const barH = navRef.current?.offsetHeight ?? 0
        if (barH > 0) {
          const headerH = parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--header-h'),
            10,
          )
          offset = (Number.isNaN(headerH) ? 52 : headerH) + barH
        } else {
          offset = FALLBACK_OFFSET
        }
      }

      sections.forEach(s => {
        const el = document.getElementById(`section-${s.id}`)
        if (!el) return
        const obs = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) setActiveSectionId(s.id)
          },
          { rootMargin: `-${offset}px 0px -50% 0px`, threshold: 0 },
        )
        obs.observe(el)
        observers.push(obs)
      })
    }

    setup()

    let raf = 0
    const onResize = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(setup)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(raf)
      observers.forEach(o => o.disconnect())
    }
  }, [sections, activeTab, topOffset])

  // Centre the active pill in the nav bar.
  // Scrolls the rail directly rather than via scrollIntoView: that walks every
  // scrollable ancestor, so scrolling down the form dragged the whole page back
  // up as the observer changed the active section.
  useEffect(() => {
    const nav = navRef.current
    const btn = nav?.querySelector(`[data-section="${activeSectionId}"]`) as HTMLElement | null
    if (!nav || !btn) return
    const left = Math.max(0, btn.offsetLeft - (nav.clientWidth - btn.offsetWidth) / 2)
    // jsdom has no Element.scrollTo — fall back to the plain property there.
    if (typeof nav.scrollTo === 'function') nav.scrollTo({ left, behavior: 'smooth' })
    else nav.scrollLeft = left
  }, [activeSectionId])

  if (activeTab !== 'edit') return null

  function scrollToSection(id: string) {
    setActiveSectionId(id)
    onSectionOpen?.(id)
    const el = document.getElementById(`section-${id}`)
    if (!el) return
    setTimeout(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  return (
    <nav
      ref={navRef}
      aria-label="Form sections"
      className="no-print"
      style={{
        position: 'sticky',
        top: 'var(--header-h)',
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        background: '#ffffff',
        borderBottom: '1px solid var(--border)',
        padding: '0 12px',
        height: 'var(--progress-h)',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        gap: '4px',
        WebkitOverflowScrolling: 'touch',
      } as React.CSSProperties}
    >
      <style>{`.step-progress-nav::-webkit-scrollbar{display:none}`}</style>
      {sections.map((section, i) => {
        const isActive = activeSectionId === section.id
        return (
          <div key={section.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
            {i > 0 && (
              <div style={{ width: '12px', height: '1px', background: 'var(--border-brand)', flexShrink: 0 }} />
            )}
            <button
              data-section={section.id}
              onClick={() => scrollToSection(section.id)}
              className="step-progress__pill"
              style={{
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                padding: '0 10px',
                // Visual height stays 30px; a mobile-only ::after (styles.css)
                // expands the touch target to 44px without growing the pill.
                height: '30px',
                minHeight: '30px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? 'var(--brand)' : 'none',
                color: isActive ? '#ffffff' : 'var(--text-muted, #888)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'color 150ms, background 150ms',
                WebkitTapHighlightColor: 'transparent',
              } as React.CSSProperties}
            >
              {section.label}
            </button>
          </div>
        )
      })}
    </nav>
  )
}
