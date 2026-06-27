import { ReactNode, useState } from 'react'

interface Props {
  id: string
  title: string
  emoji: string
  children: ReactNode
  defaultOpen?: boolean
  active?: boolean
}

export function Section({ id, title, emoji, children, defaultOpen = false, active }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section
      id={`section-${id}`}
      style={{
        margin: '12px',
        borderRadius: '12px',
        border: active ? '1px solid var(--brand)' : '1px solid var(--border, #e2e2e2)',
        background: '#ffffff',
        overflow: 'hidden',
        transition: 'border-color 200ms',
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        style={{
          display: 'flex',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 16px',
          minHeight: '52px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          textAlign: 'left',
        } as React.CSSProperties}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>{emoji}</span>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>{title}</span>
        </div>
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#888"
          strokeWidth="2"
          aria-hidden="true"
          style={{
            flexShrink: 0,
            transition: 'transform 200ms ease',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border, #e2e2e2)' }}>
          {children}
        </div>
      )}
    </section>
  )
}
