# Hero Video — Configuration & Settings Reference

## Where things live

| What | File | Line / Key |
|---|---|---|
| Video URL (swap here for custom domain) | `src/lib/config.ts` | `ASSETS.heroVideo` |
| Poster image path | `src/lib/config.ts` | `ASSETS.heroPoster` |
| HeroBanner component | `src/components/landing/HeroBanner.tsx` | full file |
| Poster image (static file) | `public/images/hero-poster.jpg` | served at `/images/hero-poster.jpg` |

---

## Swapping the video URL

The R2 dev URL is rate-limited. When a custom domain is ready, change **one line**:

```ts
// src/lib/config.ts
export const ASSETS = {
  heroVideo: 'https://YOUR-CUSTOM-DOMAIN/hero-compressed.mp4',  // ← change this
  heroPoster: '/images/hero-poster.jpg',
} as const
```

Nothing else needs to change.

---

## Video playback settings

All inside `src/components/landing/HeroBanner.tsx` on the `<video>` element:

| Attribute | Value | Why |
|---|---|---|
| `autoPlay` | true | starts on page load without user interaction |
| `loop` | true | seamless repeat, no black flash at end |
| `muted` | true | required by browsers to allow autoplay |
| `playsInline` | true | iOS Safari plays in-page, not fullscreen |
| `preload` | `"metadata"` | loads dimensions only upfront, not the full file — saves mobile data |
| `poster` | `ASSETS.heroPoster` | shows the extracted frame while video loads |
| `aria-hidden` | `"true"` | decorative — screen readers skip it |

---

## Overlay opacity

The teal overlay sits between the video and the text content:

```tsx
background: 'rgba(10, 82, 72, 0.62)'
```

- **Do not go below `0.50`** — white text fails WCAG AA contrast (4.5:1 minimum).
- **Do not go above `0.75`** — video becomes invisible.
- Current value `0.62` gives approximately 7:1 contrast ratio on white text.

Adjust only if the video content changes significantly in brightness.

---

## Slow connection / reduced motion fallback

Checked at the top of `HeroBanner.tsx` before `return`:

```ts
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
const isSlowConnection =
  navigator.connection?.saveData === true ||
  ['slow-2g', '2g'].includes(navigator.connection?.effectiveType)

const shouldPlayVideo = !prefersReducedMotion && !isSlowConnection
```

When `shouldPlayVideo` is `false`, the `<video>` element is replaced with a static `<div>` using `hero-poster.jpg` as a CSS background image. The hero still looks intentional — not broken.

This is important for users on metered mobile data (South Africa, Zimbabwe).

---

## Poster image

Generated from frame 1 of the video using ffmpeg:

```bash
curl -L "https://pub-d31f3df052b74c1fbe49b33acfae98de.r2.dev/hero-compressed.mp4" -o /tmp/hero.mp4
ffmpeg -i /tmp/hero.mp4 -ss 00:00:01 -vframes 1 -update 1 -q:v 2 public/images/hero-poster.jpg
```

If the video is replaced, regenerate the poster from the new file using the same command.

---

## Nav scroll behaviour

The landing page nav (`src/routes/index.tsx`, `LandingPage` function) uses a `scrolled` state:

```ts
const [scrolled, setScrolled] = useState(false)
useEffect(() => {
  const handleScroll = () => setScrolled(window.scrollY > 60)
  window.addEventListener('scroll', handleScroll, { passive: true })
  return () => window.removeEventListener('scroll', handleScroll)
}, [])
```

| State | Nav background | Border | CTA button |
|---|---|---|---|
| `scrolled = false` (over video) | `transparent` | `transparent` | `rgba(255,255,255,0.15)` with white border |
| `scrolled = true` (past 60px) | `#ffffff` | `0.5px solid #e2e8f0` | `#0d6b5e` solid teal |

Transition: `background 250ms ease, border-color 250ms ease`
