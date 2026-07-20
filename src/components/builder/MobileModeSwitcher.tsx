interface Props {
  activeTab: 'edit' | 'templates' | 'preview'
  onTabChange: (tab: 'edit' | 'templates' | 'preview') => void
}

const TABS = [
  { id: 'edit' as const, label: 'Edit' },
  { id: 'preview' as const, label: 'Preview' },
]

export function MobileModeSwitcher({ activeTab, onTabChange }: Props) {
  // Normalise: if "templates" is active, highlight "edit" in the switcher
  const resolved = activeTab === 'templates' ? 'edit' : activeTab

  return (
    <>
      <div className="mobile-mode-switcher no-print lg:hidden">
        <div className="mobile-mode-switcher__track">
          {TABS.map(({ id, label }) => {
            const isActive = resolved === id
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(id)}
                className={
                  'mobile-mode-switcher__tab' +
                  (isActive ? ' mobile-mode-switcher__tab--active' : '')
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>
      {/* Spacer to offset the fixed-position switcher */}
      <div className="mobile-mode-switcher-spacer lg:hidden" />
    </>
  )
}
