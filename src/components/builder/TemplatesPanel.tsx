import { useRef, useState } from 'react'
import { TEMPLATES } from '@/components/templates/registry'

interface Props {
  selectedId: string
  onSelect: (id: string) => void
}

export function TemplatesPanel({ selectedId, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(() => Math.max(0, TEMPLATES.findIndex(t => t.id === selectedId)))

  const selected = TEMPLATES.find(t => t.id === selectedId) ?? TEMPLATES[0]

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const cardW = 152 // 140px + 12px gap
    const idx = Math.round(el.scrollLeft / cardW)
    setActiveIndex(Math.max(0, Math.min(idx, TEMPLATES.length - 1)))
  }

  function scrollToIndex(i: number) {
    const el = scrollRef.current
    if (!el) return
    const cardW = 152
    el.scrollTo({ left: i * cardW, behavior: 'smooth' })
    setActiveIndex(i)
  }

  return (
    <div style={{ background: 'var(--surface-warm, #f7f7f5)', minHeight: '100%', paddingBottom: '16px' }}>
      <div style={{ padding: '16px 16px 8px', fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>
        Choose a template
      </div>

      {/* Carousel */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: '12px',
          padding: '4px 16px 12px',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'none',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}
      >
        {TEMPLATES.map((t, i) => {
          const isSelected = t.id === selectedId
          return (
            <button
              key={t.id}
              onClick={() => { onSelect(t.id); setActiveIndex(i); }}
              aria-label={`Select ${t.name} template`}
              style={{
                flexShrink: 0,
                width: '140px',
                scrollSnapAlign: 'start',
                border: isSelected ? '2px solid var(--brand)' : '1px solid var(--border, #e2e2e2)',
                borderRadius: '10px',
                background: '#fff',
                cursor: 'pointer',
                overflow: 'hidden',
                position: 'relative',
                padding: 0,
                WebkitTapHighlightColor: 'transparent',
                transition: 'border-color 150ms',
              } as React.CSSProperties}
            >
              {/* Colour accent bar */}
              <div style={{
                height: '8px',
                background: `linear-gradient(90deg, ${t.swatch[0]}, ${t.swatch[1]})`,
              }} />
              {/* Skeleton preview */}
              <div style={{ padding: '10px 10px 12px' }}>
                <div style={{ height: '6px', borderRadius: '3px', background: t.swatch[0], marginBottom: '6px', width: '70%' }} />
                <div style={{ height: '3px', borderRadius: '2px', background: '#e5e5e5', marginBottom: '4px' }} />
                <div style={{ height: '3px', borderRadius: '2px', background: '#e5e5e5', marginBottom: '4px', width: '80%' }} />
                <div style={{ height: '3px', borderRadius: '2px', background: '#e5e5e5', marginBottom: '8px', width: '60%' }} />
                <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '8px' }} />
                <div style={{ height: '3px', borderRadius: '2px', background: '#e5e5e5', marginBottom: '4px' }} />
                <div style={{ height: '3px', borderRadius: '2px', background: '#e5e5e5', width: '75%' }} />
              </div>
              {/* Template name */}
              <div style={{
                padding: '0 10px 10px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#1a1a1a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <span>{t.name}</span>
                {t.premium && (
                  <span style={{
                    fontSize: '9px',
                    fontWeight: 700,
                    color: '#c9a227',
                    background: '#fdf3cc',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    letterSpacing: '0.04em',
                  }}>PRO</span>
                )}
              </div>
              {/* Selected check badge */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#4cd6a0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Carousel dots */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '0 0 16px' }}>
        {TEMPLATES.map((_, i) => (
          <button
            key={i}
            onClick={() => scrollToIndex(i)}
            aria-label={`Go to template ${i + 1}`}
            style={{
              width: activeIndex === i ? '16px' : '6px',
              height: '6px',
              borderRadius: '3px',
              background: activeIndex === i ? 'var(--brand)' : '#ccc',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'width 200ms, background 200ms',
              minHeight: 'unset',
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Selected template info card */}
      <div style={{
        margin: '0 12px',
        padding: '12px',
        background: '#fff',
        borderRadius: '10px',
        border: '1px solid var(--border, #e2e2e2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          borderRadius: '8px',
          background: `linear-gradient(135deg, ${selected.swatch[0]}, ${selected.swatch[1]})`,
          flexShrink: 0,
        }} />
        <div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>{selected.name}</div>
          <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
            {selected.premium ? 'Premium template' : 'Free template'} · {selected.description}
          </div>
        </div>
      </div>
    </div>
  )
}
