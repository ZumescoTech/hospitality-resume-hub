// BottomCta.tsx
// Step 6 — the builder's single primary action, pinned to the bottom of the
// viewport on mobile/tablet. Replaces the four-cell BottomNav: the top mode
// switcher (Step 3) now owns navigation, so the bottom belongs to one action.
//
// The label follows the active top-level mode. Only "Download" is reachable
// today; "Get better" lights up the moment the AI Review mode exists.

import { Loader2 } from "lucide-react";

export type BuilderMode = "edit" | "templates" | "preview" | "review";

/**
 * Label for the pinned CTA. AI Review is not built yet — the case is wired so
 * turning it on is a one-line change in the builder, not here.
 */
export function ctaLabelFor(mode: BuilderMode): string {
  return mode === "review" ? "Get better" : "Download";
}

interface Props {
  mode: BuilderMode;
  onPress: () => void;
  /** Busy state of the underlying export flow. */
  busy?: boolean;
  /**
   * Pulled out of the DOM entirely while the preview lightbox is open, so it
   * can never compete with the lightbox's own zoom controls.
   */
  hidden?: boolean;
}

const DownloadIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    aria-hidden="true"
  >
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7,10 12,15 17,10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export function BottomCta({ mode, onPress, busy = false, hidden = false }: Props) {
  if (hidden) return null;

  const label = ctaLabelFor(mode);

  return (
    <div className="no-print builder-cta" data-testid="bottom-cta-bar">
      <button
        type="button"
        id="builder-cta"
        data-testid="bottom-cta"
        data-mode={mode}
        onClick={onPress}
        disabled={busy}
        className="builder-cta__button"
      >
        {busy ? (
          <Loader2 style={{ width: 20, height: 20, animation: "spin 1s linear infinite" }} />
        ) : (
          <DownloadIcon />
        )}
        <span>{busy ? "Generating…" : label}</span>
      </button>
    </div>
  );
}
