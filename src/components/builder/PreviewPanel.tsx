import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { ResumeData } from "@/types/resume";
import { FormattingSettings } from "@/types/formatting";
import { defaultFormatting } from "@/types/formatting";
import { TEMPLATES, getTemplate } from "@/components/templates/registry";
const PDFDownloadButton = lazy(() =>
  import("@/lib/pdf/PDFDownloadButton").then((m) => ({ default: m.PDFDownloadButton }))
);
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Expand,
  Maximize2,
  Minimize2,
  Printer,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PreviewZoomLightbox } from "@/components/builder/PreviewZoomLightbox";
import {
  getTemplateColours,
  templateSupportsColours,
} from "@/lib/template-colours";

// ── A4 page dimensions at 96 dpi ────────────────────────────────────────────
const PAGE_W = 794;
const PAGE_H = 1123;
const MIN_SCALE = 0.25;
const MAX_SCALE = 2.0;
// Padding (px) reserved around the page inside the viewport.
const H_PAD = 32; // 2 × 16px (p-4)
const V_PAD = 32;

type ZoomMode = "fit" | number;

interface Props {
  data: ResumeData;
  /** Notifies the builder while the zoom lightbox owns the screen (Step 6). */
  onLightboxOpenChange?: (open: boolean) => void;
}

/**
 * PreviewPanel
 *
 * Renders the right-hand live preview pane. Contains:
 *  - Zoom controls (auto-fit "Fit" mode + manual %) + print + PDF download
 *  - Live A4-proportioned resume preview with pagination for long CVs
 *
 * Template, colour and formatting controls used to live in this toolbar too.
 * Step 8 retired them: the Customize drawer (StyleDrawer) carries all three
 * and is reachable at every width, so keeping a second copy here meant two
 * routes to the same settings on desktop and two places to keep in sync.
 *
 * Zoom modes:
 *  "fit"   — auto-scale so the full page fits the container (no scrollbar)
 *  number  — manual zoom; scrollbar appears only when scale exceeds fit scale
 *
 * Pagination: ResizeObserver measures the template's natural rendered height.
 *   totalPages = ceil(height / PAGE_H). Prev/Next navigate between pages;
 *   the clip div shifts content via negative marginTop so no internal scroll
 *   is ever needed.
 */
export function PreviewPanel({ data, onLightboxOpenChange }: Props) {
  // Step 4: the document renders at its true print width (A4, 794px) by
  // default — never auto-shrunk to the viewport. Narrower viewports scroll
  // horizontally to reveal it. "Fit" remains an opt-in zoom toggle.
  const [zoomMode, setZoomMode] = useState<ZoomMode>(1);
  // Step 5: full-screen zoom lightbox. Kept local so opening/closing it cannot
  // touch builder state — the Preview tab is byte-identical after a close.
  const [lightboxOpen, setLightboxOpenState] = useState(false);
  const setLightboxOpen = useCallback(
    (open: boolean) => {
      setLightboxOpenState(open);
      onLightboxOpenChange?.(open);
    },
    [onLightboxOpenChange],
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [templateHeight, setTemplateHeight] = useState(PAGE_H);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevTemplateId = useRef(data.templateId);

  const fmt = data.formatting ?? defaultFormatting;
  const activeTpl = TEMPLATES.find((t) => t.id === data.templateId) ?? TEMPLATES[0];
  const { Component: TemplateComponent } = getTemplate(data.templateId ?? "classic");
  const supportsColours = templateSupportsColours(data.templateId ?? "classic");
  const colours = getTemplateColours(data.templateId ?? "classic", data.templateColours);

  // ── Measure the viewport container ────────────────────────────────────────
  // Fires whenever the flex-1 div resizes (toolbar opens/closes, window resize,
  // left form panel changes width). Not limited to browser resize events.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Measure the template's natural rendered height ─────────────────────────
  // contentRef is on the inner div that wraps <TemplateComponent>. Its
  // offsetHeight / contentRect.height equals the template's full natural
  // height regardless of the overflow:hidden clip applied by the parent.
  // marginTop (page-offset) does not affect the element's own height.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setTemplateHeight(Math.max(PAGE_H, entry.contentRect.height));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(templateHeight / PAGE_H));
  const isAutoFit = zoomMode === "fit";

  // Fit scale: smallest of (fit-width, fit-height, 1).
  // Never enlarges past 100% — a sparse CV should not be blown up.
  const fitScale =
    containerSize.w > 0
      ? Math.min(
          (containerSize.w - H_PAD) / PAGE_W,
          (containerSize.h - V_PAD) / PAGE_H,
          1,
        )
      : 0.78; // fallback before first ResizeObserver tick

  const scale = isAutoFit
    ? Math.max(MIN_SCALE, fitScale)
    : Math.max(MIN_SCALE, Math.min(MAX_SCALE, zoomMode as number));

  // Only enable scroll when manually zoomed past what fits the container.
  const allowScroll = !isAutoFit && (zoomMode as number) > fitScale + 0.01;

  // ── Keep currentPage in bounds ────────────────────────────────────────────
  useEffect(() => {
    setCurrentPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  // Reset to page 1 on template switch.
  useEffect(() => {
    if (data.templateId !== prevTemplateId.current) {
      prevTemplateId.current = data.templateId;
      setCurrentPage(1);
    }
  }, [data.templateId]);

  // ── Zoom helpers ──────────────────────────────────────────────────────────
  function zoomOut() {
    const base = isAutoFit ? fitScale : (zoomMode as number);
    setZoomMode(+(Math.max(MIN_SCALE, base - 0.1)).toFixed(2));
  }
  function zoomIn() {
    const base = isAutoFit ? fitScale : (zoomMode as number);
    setZoomMode(+(Math.min(MAX_SCALE, base + 0.1)).toFixed(2));
  }
  // Clicking the label toggles: Fit → lock to current scale; % → back to Fit.
  function toggleFit() {
    setZoomMode((m) => (m === "fit" ? scale : "fit"));
  }

  return (
    <div className="flex h-full flex-col">

      {/* ── Toolbar (desktop only) ───────────────────────────────────
          Step 8: template, colour and formatting controls were retired from
          here in favour of the Customize drawer, which is now reachable at
          every width and offers the same three categories. What remains is
          what the drawer does *not* carry — viewing and export. The download
          button in particular is the only export affordance at >=1024px,
          where the pinned BottomCta is display:none. */}
      <div className="no-print hidden lg:block border-b-half border-border bg-card px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">

          {/* Active template label — read-only now; changing it is the
              drawer's job. */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{activeTpl.name}</span>
              {" — "}
              {activeTpl.description}
            </p>
          </div>

          {/* Zoom controls + export actions */}
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              id="zoom-out-btn"
              aria-label="Zoom out"
              onClick={zoomOut}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>

            {/* Zoom label — click to toggle Fit ↔ manual */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    id="zoom-label"
                    aria-label={isAutoFit ? "Switch to manual zoom" : "Switch to auto-fit"}
                    onClick={toggleFit}
                    className="w-12 rounded px-1 py-0.5 text-center text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {isAutoFit ? "Fit" : `${Math.round(scale * 100)}%`}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {isAutoFit ? "Click to lock zoom" : "Click for auto-fit"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="ghost"
              size="icon"
              id="zoom-in-btn"
              aria-label="Zoom in"
              onClick={zoomIn}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>

            {/* Print visual template */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    id="print-btn"
                    aria-label="Print visual template"
                    onClick={() => window.print()}
                  >
                    <Printer className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Print visual template</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* ATS-safe PDF download — lazy-loaded to avoid SSR issues */}
            <Suspense fallback={null}>
              <PDFDownloadButton
                data={data}
                formatting={fmt}
                variant="default"
                size="sm"
                className="ml-1"
              />
            </Suspense>
          </div>
        </div>

      </div>

      {/* ── Live preview ─────────────────────────────────────── */}
      {/*
        viewportRef: measured by ResizeObserver to compute fit scale.
        overflow: hidden in Fit mode (no scrollbar ever);
                  auto   in manual mode when zoomed past fit scale.
      */}
      {/* The relative wrapper holds the floating expand button: it must NOT
          live inside the scroller (it would scroll away with the document) and
          must not reserve layout space in the flex column. */}
      <div className="relative min-h-0 flex-1">
      <div
        ref={viewportRef}
        className={cn(
          "h-full bg-muted/40",
          allowScroll ? "overflow-auto" : "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-col p-4",
            isAutoFit ? "justify-center" : "justify-start",
          )}
          // `safe center`: centre the page when it fits, but fall back to
          // left-align (start) when it is wider than the container so the
          // overflow stays reachable — plain `center` clips the left edge and
          // makes it un-scrollable.
          style={{ alignItems: "safe center" }}
        >
          {/*
            Page clip box:
            - Fixed A4 size (794 × 1123) with overflow:hidden clips content
              to exactly one page's worth — no internal scroll.
            - CSS transform:scale() shrinks/grows the clipped page visually.
            - marginBottom compensates for the gap between the element's
              layout height (1123px) and its visual height (1123 * scale).
          */}
          <div
            className="print-area bg-white shadow-elegant"
            data-testid="cv-document"
            style={{
              width: PAGE_W,
              height: PAGE_H,
              overflow: "hidden",
              flexShrink: 0,
              transform: `scale(${scale})`,
              transformOrigin: "top center",
              marginBottom: `${(scale - 1) * PAGE_H}px`,
            }}
          >
            {/*
              contentRef: observed for natural template height → totalPages.
              marginTop shifts content up so the correct page is visible
              through the clip. Changing marginTop does NOT affect the
              element's own height — ResizeObserver always reports the full
              template height regardless of current page.
            */}
            <div
              ref={contentRef}
              style={{
                width: PAGE_W,
                marginTop: -(currentPage - 1) * PAGE_H,
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

        {/* ── Floating expand button — centred over the document ──────── */}
        <button
          type="button"
          id="preview-expand-btn"
          data-testid="preview-expand-btn"
          aria-label="Open full-screen preview"
          onClick={() => setLightboxOpen(true)}
          className="no-print absolute left-1/2 top-1/2 z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-white shadow-elegant transition-transform active:scale-95"
          style={{
            background: "rgba(24, 24, 27, 0.82)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(2px)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          <Expand className="h-6 w-6" />
        </button>
      </div>

      {/* ── Full-screen zoom lightbox ─────────────────────────── */}
      <PreviewZoomLightbox
        data={data}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      {/* ── Pagination controls ───────────────────────────────── */}
      {totalPages > 1 && (
        <div className="no-print flex items-center justify-center gap-3 border-t-half border-border bg-card py-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous page"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[80px] text-center text-xs text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next page"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
