import { useEffect } from 'react'

/**
 * Attaches an IntersectionObserver to all .gh-reveal and .gh-reveal-left
 * elements on the page, adding the .gh-visible class when they enter the
 * viewport. Two fallback paths ensure content is never permanently hidden:
 *
 * 1. If IntersectionObserver is unavailable (SSR / old browser), all elements
 *    are revealed immediately.
 * 2. Elements already within the viewport at mount are revealed immediately
 *    without waiting for a scroll event.
 *
 * prefers-reduced-motion is handled in CSS: those users get opacity:1 /
 * transform:none without transition, so no JS change needed here.
 */
export function useReveal() {
  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>('.gh-reveal, .gh-reveal-left')
    )

    // Fallback: no IntersectionObserver (e.g. pre-hydration, old browser)
    if (typeof IntersectionObserver === 'undefined') {
      elements.forEach((el) => el.classList.add('gh-visible'))
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('gh-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12 }
    )

    elements.forEach((el) => {
      // In-viewport fallback: reveal immediately if already visible at mount
      const rect = el.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('gh-visible')
      } else {
        observer.observe(el)
      }
    })

    return () => observer.disconnect()
  }, [])
}
