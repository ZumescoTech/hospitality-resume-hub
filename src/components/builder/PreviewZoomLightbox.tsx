// PreviewZoomLightbox.tsx
// Step 5 — full-screen zoom view for the CV preview.
//
// Opened from the floating expand button on the Preview tab. Renders through a
// portal on document.body so it escapes the builder's grid/stacking contexts.
//
// Deliberate choices:
//  - The builder keeps owning all resume state; this component owns nothing but
//    its own zoom level. Closing therefore cannot lose builder state.
//  - No body scroll lock. `overscroll-behavior: contain` on the pan surface
//    stops scroll chaining, so the page behind keeps its exact scroll position
//    without the position:fixed dance (which shifts layout on close).
//  - The document renders at its true print width and is scaled with a CSS
//    transform; a wrapper carries the *scaled* box size so both axes scroll.

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Minus, Plus, X } from "lucide-react";
import { ResumeData } from "@/types/resume";
import { defaultFormatting } from "@/types/formatting";
import { getTemplate } from "@/components/templates/registry";
import { getTemplateColours, templateSupportsColours } from "@/lib/template-colours";

// A4 at 96 dpi — same constants the preview pane renders at.
const PAGE_W = 794;
const PAGE_H = 1123;

/** Discrete zoom stops. 100% (index 2) is the entry point. */
export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
const DEFAULT_ZOOM_INDEX = 2;
/** Breathing room around the document; also guarantees pan room at 50%. */
const PAN_SLACK = 24;

interface Props {
  data: ResumeData;
  isOpen: boolean;
  onClose: () => void;
}

export function PreviewZoomLightbox({ data, isOpen, onClose }: Props) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX);
  const [docHeight, setDocHeight] = useState(PAGE_H);

  const panRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];
  const fmt = data.formatting ?? defaultFormatting;
  const templateId = data.templateId ?? "classic";
  const { Component: TemplateComponent } = getTemplate(templateId);
  const supportsColours = templateSupportsColours(templateId);
  const colours = getTemplateColours(templateId, data.templateColours);

  // ── Reset zoom every time it opens ────────────────────────────────────────
  useEffect(() => {
    if (isOpen) setZoomIndex(DEFAULT_ZOOM_INDEX);
  }, [isOpen]);

  // ── Escape closes ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ── Measure the template's natural height so the scaled box can scroll ────
  useEffect(() => {
    if (!isOpen) return;
    const el = docRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setDocHeight(Math.max(PAGE_H, entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isOpen]);

  // Move focus into the dialog so Escape and tab order behave. Scroll starts at
  // the document's top-left — where the page's own text starts — rather than
  // centred, which drops a narrow viewport into the middle of the lines.
  useEffect(() => {
    if (!isOpen) return;
    closeRef.current?.focus({ preventScroll: true });
    panRef.current?.scrollTo(0, 0);
  }, [isOpen]);

  // ── Drag-to-pan (mouse/pen). Touch uses native momentum scrolling. ────────
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  // Set when a drag actually moved, so releasing the mouse over the backdrop
  // after a pan does not read as a "click outside" and close the lightbox.
  const dragged = useRef(false);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (e.pointerType === "touch") return;
    const el = panRef.current;
    if (!el) return;
    dragged.current = false;
    drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const el = panRef.current;
    const d = drag.current;
    if (!el || !d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragged.current = true;
    el.scrollLeft = d.left - dx;
    el.scrollTop = d.top - dy;
  }, []);

  const endDrag = useCallback(() => {
    drag.current = null;
  }, []);

  // Backdrop click — anything outside the document itself closes.
  const onBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (dragged.current) {
        dragged.current = false;
        return;
      }
      const doc = docRef.current;
      if (doc && doc.contains(e.target as Node)) return;
      onClose();
    },
    [onClose],
  );

  if (!isOpen) return null;

  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;

  const controlBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 44,
    height: 44,
    minWidth: 44,
    minHeight: 44,
    borderRadius: 999,
    border: "none",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  };

  return createPortal(
    <div
      className="no-print"
      data-testid="preview-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="CV preview, zoomable"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        // Near-opaque: at 6% transparency the white bottom nav bled through.
        background: "rgba(17, 17, 19, 0.985)",
      }}
    >
      {/* Pan surface — also the backdrop: a click landing on it (not on the
          document) closes, matching the usual lightbox affordance. */}
      <div
        ref={panRef}
        data-testid="lightbox-pan"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={endDrag}
        onClick={onBackdropClick}
        style={{
          position: "absolute",
          inset: 0,
          overflow: "auto",
          overscrollBehavior: "contain",
          WebkitOverflowScrolling: "touch",
          cursor: "grab",
        }}
      >
        {/*
          Pan surface content. `min-{width,height}: 100% + 2×PAN_SLACK` keeps a
          little scrollable headroom on both axes even when the whole document
          already fits, so the user can nudge it at every zoom stop instead of
          it being pinned in place at the low ones.
        */}
        <div
          style={{
            boxSizing: "border-box",
            minWidth: `calc(100% + ${PAN_SLACK * 2}px)`,
            minHeight: `calc(100% + ${PAN_SLACK * 2}px)`,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "safe center",
            padding: `${PAN_SLACK}px ${PAN_SLACK}px 104px`,
          }}
        >
          {/* Carries the *scaled* footprint so the pan surface can scroll to
              the document's real visual bounds at every zoom level. */}
          <div
            style={{
              width: PAGE_W * zoom,
              height: docHeight * zoom,
              flexShrink: 0,
            }}
          >
            <div
              ref={docRef}
              data-testid="lightbox-cv-document"
              style={{
                width: PAGE_W,
                background: "#fff",
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                fontFamily: `"${fmt.fontFamily}", sans-serif`,
                fontSize: `${fmt.bodyFontSize}pt`,
                lineHeight: fmt.lineSpacing,
              }}
            >
              <TemplateComponent data={data} colours={supportsColours ? colours : undefined} />
            </div>
          </div>
        </div>
      </div>

      {/* ── Zoom controls — fixed to the bottom, thumb-reachable at 375px ──── */}
      <div
        data-testid="lightbox-zoom-controls"
        style={{
          position: "fixed",
          left: "50%",
          bottom: "calc(20px + env(safe-area-inset-bottom, 0px))",
          transform: "translateX(-50%)",
          zIndex: 310,
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 6px",
          borderRadius: 999,
          background: "rgba(28, 28, 30, 0.96)",
          border: "1px solid rgba(255,255,255,0.14)",
          boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
        }}
      >
        <button
          type="button"
          id="lightbox-zoom-out"
          aria-label="Zoom out"
          disabled={!canZoomOut}
          onClick={() => setZoomIndex((i) => Math.max(0, i - 1))}
          style={{
            ...controlBtn,
            opacity: canZoomOut ? 1 : 0.35,
            cursor: canZoomOut ? "pointer" : "default",
          }}
        >
          <Minus style={{ width: 18, height: 18 }} />
        </button>

        <span
          id="lightbox-zoom-level"
          data-zoom={zoom}
          aria-live="polite"
          style={{
            minWidth: 52,
            textAlign: "center",
            fontSize: 13,
            fontWeight: 600,
            color: "#fff",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {Math.round(zoom * 100)}%
        </span>

        <button
          type="button"
          id="lightbox-zoom-in"
          aria-label="Zoom in"
          disabled={!canZoomIn}
          onClick={() => setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))}
          style={{
            ...controlBtn,
            opacity: canZoomIn ? 1 : 0.35,
            cursor: canZoomIn ? "pointer" : "default",
          }}
        >
          <Plus style={{ width: 18, height: 18 }} />
        </button>

        <span
          style={{ width: 1, height: 24, background: "rgba(255,255,255,0.18)", margin: "0 2px" }}
        />

        <button
          ref={closeRef}
          type="button"
          id="lightbox-close"
          aria-label="Close preview"
          onClick={onClose}
          style={controlBtn}
        >
          <X style={{ width: 20, height: 20 }} />
        </button>
      </div>
    </div>,
    document.body,
  );
}
