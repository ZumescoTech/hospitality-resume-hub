import { ReactNode, useState } from 'react'
import {
  User, Briefcase, GraduationCap, Sparkles, ClipboardList, UtensilsCrossed,
} from 'lucide-react'

const iconStyle = { flexShrink: 0 as const, color: 'var(--brand)' }

const SECTION_ICONS: Record<string, React.ReactNode> = {
  personal:       <User size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
  experience:     <Briefcase size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
  education:      <GraduationCap size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
  skills:         <Sparkles size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
  certifications: <ClipboardList size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
  hospitality:    <UtensilsCrossed size={18} strokeWidth={1.8} aria-hidden="true" style={iconStyle} />,
}

interface Props {
  id: string
  title: string
  children: ReactNode
  defaultOpen?: boolean
  active?: boolean
  // Controlled mode — when provided, these override local state
  isOpen?: boolean
  onToggle?: () => void
}

export function Section({ id, title, children, defaultOpen = false, active, isOpen, onToggle }: Props) {
  const [localOpen, setLocalOpen] = useState(defaultOpen)
  const icon = SECTION_ICONS[id] ?? null

  const isControlled = isOpen !== undefined && onToggle !== undefined
  const open = isControlled ? isOpen : localOpen

  const handleToggle = () => {
    if (isControlled) {
      onToggle()
    } else {
      setLocalOpen(o => !o)
    }
  }

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
        scrollMarginTop: 'calc(var(--header-h, 52px) + var(--progress-h, 40px) + 8px)',
      }}
    >
      <button
        type="button"
        onClick={handleToggle}
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
