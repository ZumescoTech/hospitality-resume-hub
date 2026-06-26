// src/components/landing/HeroBanner.tsx
// Full-viewport video hero for the landing page.
// Video URL lives in src/lib/config.ts — swap it there when moving to a custom domain.

import { ASSETS } from '@/lib/config'

export function HeroBanner() {
  // Skip autoplay on slow connections or reduced motion preference
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const isSlowConnection =
    typeof navigator !== 'undefined' &&
    (((navigator as any).connection?.saveData === true) ||
      ['slow-2g', '2g'].includes((navigator as any).connection?.effectiveType))

  const shouldPlayVideo = !prefersReducedMotion && !isSlowConnection

  return (
    <section
      aria-label="GetHired hero"
      style={{
        position: 'relative',
        height: '100svh',
        minHeight: '580px',
        maxHeight: '900px',
        overflow: 'hidden',
        background: '#0a5248', // fallback shown while video loads
      }}
    >
      {/* ── VIDEO / POSTER FALLBACK ── */}
      {shouldPlayVideo ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={ASSETS.heroPoster}
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            minWidth: '100%',
            minHeight: '100%',
            width: 'auto',
            height: 'auto',
            objectFit: 'cover',
            zIndex: 0,
          }}
        >
          <source src={ASSETS.heroVideo} type="video/mp4" />
        </video>
      ) : (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url(${ASSETS.heroPoster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 0,
          }}
        />
      )}

      {/* ── TEAL OVERLAY ── rgba(10,82,72,0.62) keeps WCAG AA (≥4.5:1) on white text */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(10, 82, 72, 0.62)',
          zIndex: 1,
        }}
      />

      {/* ── CONTENT ── */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '80px 24px 40px', // top clears 56px nav + extra breathing room
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(201, 162, 39, 0.15)',
            border: '0.5px solid rgba(201, 162, 39, 0.6)',
            borderRadius: '999px',
            padding: '5px 14px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#e8c547',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            marginBottom: '20px',
            fontFamily: 'Rubik, system-ui, sans-serif',
          }}
        >
          ⚓ Hospitality CV builder
        </div>

        {/* Headline */}
        <h1
          style={{
            fontSize: 'clamp(26px, 7vw, 48px)',
            fontWeight: 500,
            color: '#ffffff',
            lineHeight: 1.2,
            letterSpacing: '-0.01em',
            marginBottom: '14px',
            maxWidth: '560px',
            fontFamily: 'Rubik, system-ui, sans-serif',
          }}
        >
          Get hired on your{' '}
          <span style={{ color: '#e8c547' }}>dream cruise line</span>
        </h1>

        {/* Sub-headline */}
        <p
          style={{
            fontSize: 'clamp(13px, 3.5vw, 16px)',
            color: 'rgba(255, 255, 255, 0.78)',
            lineHeight: 1.65,
            marginBottom: '28px',
            maxWidth: '320px',
            fontFamily: 'Rubik, system-ui, sans-serif',
          }}
        >
          Build an ATS-ready CV in minutes — with AI phrasing built for
          waiters, bartenders, sommeliers, and hospitality crew.
        </p>

        {/* Stats row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          {[
            { num: '2 min', label: 'to build' },
            { num: '13+', label: 'templates' },
            { num: 'ATS', label: 'optimised' },
          ].map((s, i) => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
              {i > 0 && (
                <div
                  style={{
                    width: '1px',
                    height: '32px',
                    background: 'rgba(255,255,255,0.15)',
                    margin: '0 16px',
                  }}
                />
              )}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '18px',
                    fontWeight: 500,
                    color: '#ffffff',
                    fontFamily: 'Rubik, system-ui, sans-serif',
                  }}
                >
                  {s.num}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.5)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    fontFamily: 'Rubik, system-ui, sans-serif',
                  }}
                >
                  {s.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            width: '100%',
            maxWidth: '300px',
          }}
        >
          {/* Primary — /builder */}
          <a
            href="/builder"
            style={{
              height: '50px',
              minHeight: '50px',
              background: '#0d6b5e',
              border: 'none',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '15px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              textDecoration: 'none',
              fontFamily: 'Rubik, system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Build my CV — it&apos;s free
          </a>

          {/* Secondary — CV checker */}
          <a
            href="/tools/cruise-cv-checker"
            style={{
              height: '44px',
              minHeight: '44px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '0.5px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '10px',
              color: '#ffffff',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textDecoration: 'none',
              fontFamily: 'Rubik, system-ui, sans-serif',
              cursor: 'pointer',
            }}
          >
            Check my CV free
          </a>
        </div>
      </div>

      {/* Scroll indicator dots */}
      <div
        style={{
          position: 'absolute',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#e8c547' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.3)' }} />
        <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
      </div>
    </section>
  )
}
