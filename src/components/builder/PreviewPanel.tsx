import { useState, lazy, Suspense } from "react";
import { ResumeData } from "@/types/resume";
import { FormattingSettings } from "@/types/formatting";
import { defaultFormatting } from "@/types/formatting";
import { TEMPLATES } from "@/components/templates/registry";
import { ResumeRenderer } from "@/components/templates/ResumeRenderer";
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
import { Maximize2, Minimize2, Printer, SlidersHorizontal, ChevronDown } from "lucide-react";

interface Props {
  data: ResumeData;
  onTemplateChange: (id: string) => void;
  onFormattingChange: (formatting: FormattingSettings) => void;
}

/**
 * PreviewPanel
 *
 * Renders the right-hand live preview pane. Contains:
 *  - Template selector dropdown + swatch gallery
 *  - Collapsible FormattingPanel for typography/layout controls
 *  - Zoom controls + print + PDF download
 *  - Live A4-proportioned resume preview
 */
export function PreviewPanel({ data, onTemplateChange, onFormattingChange }: Props) {
  const [zoom, setZoom] = useState(0.78);
  const [formattingOpen, setFormattingOpen] = useState(false);

  const fmt = data.formatting ?? defaultFormatting;
  const activeTpl = TEMPLATES.find((t) => t.id === data.templateId) ?? TEMPLATES[0];

  return (
    <div className="flex h-full flex-col">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="no-print border-b border-border bg-card p-4">
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
            <SelectTrigger className="h-9 w-[210px] shrink-0" id="template-select">
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
              onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              id="zoom-in-btn"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2)))}
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
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              id={`swatch-${t.id}`}
              onClick={() => onTemplateChange(t.id)}
              className={cn(
                "group flex shrink-0 flex-col items-start gap-1.5 rounded-lg border-2 p-2 text-left transition-all",
                t.id === data.templateId
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div className="flex h-12 w-20 overflow-hidden rounded">
                <div className="flex-1" style={{ background: t.swatch[0] }} />
                <div className="w-1/3" style={{ background: t.swatch[1] }} />
              </div>
              <div>
                <p className="text-xs font-semibold">{t.name}</p>
                <p className="text-[10px] text-muted-foreground">{t.description}</p>
              </div>
            </button>
          ))}
        </div>

        {/* ── Formatting controls ─────────────────────────────── */}
        <Collapsible open={formattingOpen} onOpenChange={setFormattingOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "mt-3 flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors",
                formattingOpen
                  ? "border-primary/40 bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
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
      </div>

      {/* ── Live preview ─────────────────────────────────────── */}
      <div className="flex-1 overflow-auto bg-muted/40 p-4 sm:p-8">
        <ResumeRenderer
          data={data}
          template={data.templateId}
          scale={zoom}
        />
      </div>
    </div>
  );
}
