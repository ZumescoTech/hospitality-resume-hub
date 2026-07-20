import { useState, useEffect, useRef, lazy, Suspense, useCallback } from "react";
import { ResumeData } from "@/types/resume";
import { FormattingSettings } from "@/types/formatting";
import { defaultFormatting } from "@/types/formatting";
import { TEMPLATES, getTemplate } from "@/components/templates/registry";
import { FormattingPanel } from "@/components/builder/FormattingPanel";
const PDFDownloadButton = lazy(() =>
  import("@/lib/pdf/PDFDownloadButton").then((m) => ({ default: m.PDFDownloadButton }))
);
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Maximize2,
  Minimize2,
  Printer,
  SlidersHorizontal,
  Palette,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TemplateColourPicker } from "@/components/builder/TemplateColourPicker";
import {
  TemplateColours,
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
  onTemplateChange: (id: string) => void;
  onFormattingChange: (formatting: FormattingSettings) => void;
  onColourChange: (slot: keyof TemplateColours, value: string) => void;
  onColourReset: () => void;
}

/**
 * PreviewPanel
 *
 * Renders the right-hand live preview pane. Contains:
 *  - Template selector dropdown + swatch gallery
 *  - Collapsible FormattingPanel for typography/layout controls
 *  - Zoom controls (auto-fit "Fit" mode + manual %) + print + PDF download
 *  - Live A4-proportioned resume preview with pagination for long CVs
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
export function PreviewPanel({ data, onTemplateChange, onFormattingChange, onColourChange, onColourReset }: Props) {
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [formattingOpen, setFormattingOpen] = useState(false);
  const [colourPickerOpen, setColourPickerOpen] = useState(false);
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

      {/* ── Toolbar (desktop only — mobile uses TemplatesPanel tab) ─── */}
      <div className="no-print hidden lg:block border-b-half border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">

          {/* Active template label */}
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold">Template</p>
            <p className="truncate text-xs text-muted-foreground">
              {activeTpl.name} — {activeTpl.description}
            </p>
          </div>

          {/* Dropdown selector */}
          <Select value={data.templateId} onValueChange={onTemplateChange}>
            <SelectTrigger className="h-9 w-full min-w-[160px] max-w-[210px] shrink-0" id="template-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TEMPLATES.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  <span className="flex items-center gap-2">
                    <span className="flex h-3 w-5 overflow-hidden rounded-sm">
                      <span className="flex-1" style={{ background: t.swatch[0] }} />
                      <span className="w-1/3" style={{ background: t.swatch[1] }} />
                    </span>
                    {t.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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

        {/* ── Swatch gallery ──────────────────────────────────── */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              id={`swatch-${t.id}`}
              onClick={() => onTemplateChange(t.id)}
              className={cn(
                "group flex shrink-0 flex-col items-start gap-1.5 rounded-lg p-2 text-left transition-all",
                t.id === data.templateId
                  ? "border border-primary bg-primary/5"
                  : "border-half border-border hover:border-primary/40",
              )}
            >
              <div className="flex h-12 w-20 overflow-hidden rounded-sm">
                <div className="flex-1" style={{ background: t.swatch[0] }} />
                <div className="w-1/3" style={{ background: t.swatch[1] }} />
              </div>
              <p className="text-xs font-medium text-foreground">{t.name}</p>
            </button>
          ))}
        </div>
        {/* ── Formatting controls ─────────────────────────────── */}
        <Collapsible open={formattingOpen} onOpenChange={setFormattingOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "mt-3 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                formattingOpen
                  ? "border border-primary/40 bg-primary/5 text-foreground"
                  : "border-half border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span className="font-medium">Format</span>
                <span className="text-xs opacity-60">
                  {fmt.fontFamily} · {fmt.bodyFontSize}pt · {fmt.marginInches}" margins
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  formattingOpen && "rotate-180",
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 rounded-lg border border-border bg-background">
              <FormattingPanel settings={fmt} onChange={onFormattingChange} />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ── Colour customisation (templates with colour support) ────── */}
        {supportsColours && (
          <Collapsible open={colourPickerOpen} onOpenChange={setColourPickerOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={cn(
                  "mt-2 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                  colourPickerOpen
                    ? "border border-primary/40 bg-primary/5 text-foreground"
                    : "border-half border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <span className="flex items-center gap-2">
                  <Palette className="h-3.5 w-3.5" />
                  <span className="font-medium">Colours</span>
                  <span className="text-xs opacity-60">customise palette</span>
                </span>
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 transition-transform",
                    colourPickerOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 rounded-lg border border-border bg-background">
                <TemplateColourPicker
                  templateId={data.templateId}
                  colours={colours}
                  onChange={onColourChange}
                  onReset={onColourReset}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </div>

      {/* ── Live preview ─────────────────────────────────────── */}
      {/*
        viewportRef: measured by ResizeObserver to compute fit scale.
        overflow: hidden in Fit mode (no scrollbar ever);
                  auto   in manual mode when zoomed past fit scale.
      */}
      <div
        ref={viewportRef}
        className={cn(
          "flex-1 bg-muted/40",
          allowScroll ? "overflow-auto" : "overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex min-h-full flex-col items-center p-4",
            isAutoFit ? "justify-center" : "justify-start",
          )}
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
