interface Props {
  activeTab: 'edit' | 'templates' | 'preview'
  onTabChange: (tab: 'edit' | 'templates' | 'preview') => void
  onDownload: () => void
}

const EditIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
)

const TemplatesIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/>
    <rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
)

const PreviewIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)

const DownloadIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7,10 12,15 17,10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
)

const tabs = [
  { id: 'edit' as const, label: 'Edit', Icon: EditIcon },
  { id: 'templates' as const, label: 'Templates', Icon: TemplatesIcon },
  { id: 'preview' as const, label: 'Preview', Icon: PreviewIcon },
]

export function BottomNav({ activeTab, onTabChange, onDownload }: Props) {
  return (
    <nav
      role="navigation"
      aria-label="Builder navigation"
      className="no-print lg:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 'var(--nav-h)',
        background: '#ffffff',
        borderTop: '1px solid var(--border, #e2e2e2)',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.07)',
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = activeTab === id
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              height: 'var(--nav-h)',
              color: isActive ? 'var(--brand)' : 'var(--text-muted, #888)',
              fontSize: '10px',
              fontWeight: 500,
              letterSpacing: '0.02em',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'color 150ms',
              WebkitTapHighlightColor: 'transparent',
            } as React.CSSProperties}
          >
            {/* Active indicator bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '16%',
              right: '16%',
              height: '2.5px',
              borderRadius: '0 0 3px 3px',
              background: 'var(--brand)',
              opacity: isActive ? 1 : 0,
              transition: 'opacity 150ms',
            }} />
            <Icon />
            <span>{label}</span>
          </button>
        )
      })}

      {/* Download — full teal */}
      <button
        onClick={onDownload}
        aria-label="Download PDF"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          height: 'var(--nav-h)',
          color: '#ffffff',
          background: 'var(--brand)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '10px',
          fontWeight: 500,
          letterSpacing: '0.02em',
          WebkitTapHighlightColor: 'transparent',
          transition: 'background 150ms',
        } as React.CSSProperties}
        onMouseDown={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-dark)')}
        onMouseUp={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand)')}
        onTouchStart={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand-dark)')}
        onTouchEnd={e => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--brand)')}
      >
        <DownloadIcon />
        <span style={{ color: '#ffffff' }}>Download</span>
      </button>
    </nav>
  )
}
