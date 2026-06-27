import { useEffect, useRef, useState } from 'react'

interface SectionDef {
  id: string
  label: string
}

interface Props {
  sections: SectionDef[]
  activeTab: string
  /** Header height + progress bar height in px — used as rootMargin top offset */
  topOffset?: number
}

export function StepProgress({ sections, activeTab, topOffset = 92 }: Props) {
  const [activeSectionId, setActiveSectionId] = useState<string>(sections[0]?.id ?? '')
  const navRef = useRef<HTMLElement>(null)

  // IntersectionObserver: highlight pill as user scrolls through sections
  useEffect(() => {
    if (activeTab !== 'edit') return
    const observers: IntersectionObserver[] = []
    sections.forEach(s => {
      const el = document.getElementById(`section-${s.id}`)
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveSectionId(s.id)
        },
        { rootMargin: `-${topOffset}px 0px -50% 0px`, threshold: 0 },
      )
      obs.observe(el)
      observers.push(obs)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [sections, activeTab, topOffset])

  // Scroll the active pill into view in the nav bar
  useEffect(() => {
    const btn = navRef.current?.querySelector(`[data-section="${activeSectionId}"]`) as HTMLElement | null
    btn?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
  }, [activeSectionId])

  if (activeTab !== 'edit') return null

  function scrollToSection(id: string) {
    setActiveSectionId(id)
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
              <div style={{ width: '12px', height: '1px', background: 'var(--border, #e2e2e2)', flexShrink: 0 }} />
            )}
            <button
              data-section={section.id}
              onClick={() => scrollToSection(section.id)}
              style={{
                fontSize: '12px',
                fontWeight: isActive ? 600 : 500,
                whiteSpace: 'nowrap',
                padding: '0 10px',
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
