/**
 * LOGO USAGE RULES — read before changing anything here
 *
 * 1. ALWAYS set height in px, ALWAYS let width be auto.
 *    The logo is landscape (roughly 1.7:1). Forcing a square distorts it.
 *
 * 2. NEVER set width and height to equal values (e.g. 32x32).
 *    That forces a square crop and makes the ship look squished.
 *
 * 3. The logo is teal and gold on a TRANSPARENT background.
 *    It is visible on both dark (hero/teal) and light (white) backgrounds.
 *    No need for a background colour behind it.
 *
 * 4. Minimum height: 28px (mobile, tight spaces)
 *    Recommended heights:
 *      - Nav mobile:   32px → rendered width auto (~54px)
 *      - Nav desktop:  40px → rendered width auto (~67px)
 *      - Footer:       40px
 *      - Hero badge:   64px
 *      - OG/social:    use favicon-512.png (512×512 square crop of bow)
 *
 * 5. Pair with wordmark text ("GetHired") in Rubik 500 at 17px.
 *    The text gap is 10px. This gives the lockup enough visual mass in the nav.
 *
 * 6. Colour variants:
 *    - variant="light" → wordmark white — use over dark/video/teal backgrounds
 *    - variant="dark"  → wordmark #0a5248 — use over white/light backgrounds
 */

interface LogoLockupProps {
  /** Controls text colour — use 'light' over dark/video backgrounds,
      'dark' over white backgrounds */
  variant?: 'light' | 'dark'
  /** Height of the logo image in px. Defaults to 36. */
  height?: number
  /** Whether to show the wordmark text next to the logo */
  showWordmark?: boolean
}

export function LogoLockup({
  variant = 'dark',
  height = 36,
  showWordmark = true,
}: LogoLockupProps) {
  const wordmarkColour = variant === 'light' ? '#ffffff' : '#0a5248'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      flexShrink: 0,
    }}>
      {/* Logo image
          - Uses <picture> to serve 40h on desktop, 32h on mobile
          - height is fixed, width is ALWAYS auto — the ship is landscape (1.7:1) */}
      <picture>
        <source
          media="(min-width: 640px)"
          srcSet="/images/logo-nav-40h.png"
          width={67}
          height={40}
        />
        <img
          src="/images/logo-nav-32h.png"
          alt={showWordmark ? '' : 'GetHired'}
          width={54}
          height={32}
          style={{
            height: `${height}px`,
            width: 'auto',       // CRITICAL: never force a square
            display: 'block',
            flexShrink: 0,
            objectFit: 'contain',
          }}
        />
      </picture>

      {showWordmark && (
        <span style={{
          fontSize: '17px',
          fontWeight: 500,
          fontFamily: 'Rubik, system-ui, sans-serif',
          letterSpacing: '-0.01em',
          lineHeight: 1,
          color: wordmarkColour,
          whiteSpace: 'nowrap',
          transition: 'color 200ms ease',
          userSelect: 'none',
        }}>
          GetHired
        </span>
      )}
    </div>
  )
}
