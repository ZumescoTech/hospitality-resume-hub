import { useIsDesktop } from '@/hooks/use-is-desktop'

export type BuilderTab = 'edit' | 'preview'

interface Props {
  activeTab: BuilderTab
  onTabChange: (tab: BuilderTab) => void
}

const TABS = [
  { id: 'edit' as const, label: 'Edit' },
  { id: 'preview' as const, label: 'Preview' },
]

export function MobileModeSwitcher({ activeTab, onTabChange }: Props) {
  const isDesktop = useIsDesktop()
  const resolved = activeTab

  // At >=1024px both panes are on screen at once, so there is nothing to switch
  // between. Unmounting rather than leaving it display:none keeps two dead
  // role="tab" controls out of the accessibility tree and out of tab order.
  //
  // The `lg:hidden` classes below stay as the pre-hydration guard: SSR has no
  // viewport and renders the mobile layout, so the switcher is in the initial
  // HTML at every width and CSS has to hide it until this runs.
  if (isDesktop) return null

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
