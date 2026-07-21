import { useSyncExternalStore } from 'react'

/**
 * True at >=1024px — the width at which the builder shows the editor and the
 * preview as two independent panes instead of one tab at a time.
 *
 * This is the layout's own signal, deliberately separate from the builder's
 * `activeTab`. Before Step 8 the desktop split was produced by Tailwind's
 * `lg:block` overriding a `hidden` that `activeTab` had put there, so the
 * desktop layout silently depended on mobile tab state. Reading the viewport
 * directly lets the two panes render because the window is wide, full stop.
 *
 * `useSyncExternalStore` rather than useState + useEffect: the server snapshot
 * is an explicit `false`, so SSR renders the mobile layout and the client's
 * first paint already has the real value — no flash of the wrong layout.
 */
export const DESKTOP_BREAKPOINT = 1024

const QUERY = `(min-width: ${DESKTOP_BREAKPOINT}px)`

function subscribe(onChange: () => void) {
  // Pre-hydration or a browser without matchMedia: nothing to subscribe to.
  // getSnapshot's own guard keeps returning false, which is a stable value.
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {}
  }
  const mql = window.matchMedia(QUERY)
  mql.addEventListener('change', onChange)
  return () => mql.removeEventListener('change', onChange)
}

function getSnapshot() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia(QUERY).matches
}

// SSR has no viewport. Mobile is the safe default: it renders one pane, which
// is correct-looking at every width, where guessing desktop would not be.
function getServerSnapshot() {
  return false
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
