import { ReactNode, useState } from 'react'
import {
  User, Briefcase, GraduationCap, Sparkles, ClipboardList, UtensilsCrossed,
} from 'lucide-react'

const ICON_MAP: Record<string, React.ReactNode> = {
  '👤': <User size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
  '💼': <Briefcase size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
  '🎓': <GraduationCap size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
  '⭐': <Sparkles size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
  '📋': <ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
  '🍽️': <UtensilsCrossed size={18} strokeWidth={1.8} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--brand)' }} />,
}

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
  const icon = ICON_MAP[emoji] ?? null

  return (
    <section
      id={`section-${id}`}
      style={{
        margin: '12px',
        borderRadius: '12px',
        border: active ? '1px solid var(--brand)' : '1px solid var(--border-brand)',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {icon}
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
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border-brand)' }}>
          {children}
        </div>
      )}
    </section>
  )
}
