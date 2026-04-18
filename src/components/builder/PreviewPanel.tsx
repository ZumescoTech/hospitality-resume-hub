import { useState } from "react";
import { ResumeData } from "@/types/resume";
import { TEMPLATES, getTemplate } from "@/components/templates/registry";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Maximize2, Minimize2, Printer } from "lucide-react";

interface Props {
  data: ResumeData;
  onTemplateChange: (id: string) => void;
}

export function PreviewPanel({ data, onTemplateChange }: Props) {
  const [zoom, setZoom] = useState(0.78);
  const tpl = getTemplate(data.templateId);
  const Tpl = tpl.Component;

  return (
    <div className="flex h-full flex-col">
      {/* Template picker */}
      <div className="no-print border-b border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-display text-sm font-semibold">Template</p>
            <p className="truncate text-xs text-muted-foreground">
              {tpl.name} — {tpl.description}
            </p>
          </div>
          <Select value={data.templateId} onValueChange={onTemplateChange}>
            <SelectTrigger className="h-9 w-[210px] shrink-0">
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
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
              <Minimize2 className="h-4 w-4" />
            </Button>
            <span className="w-10 text-center text-xs text-muted-foreground">
              {Math.round(zoom * 100)}%
            </span>
            <Button variant="ghost" size="icon" onClick={() => setZoom((z) => Math.min(1.2, z + 0.1))}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.print()} title="Print / Save PDF">
              <Printer className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
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
      </div>

      {/* Preview */}
      <div className="flex-1 overflow-auto bg-muted/40 p-4 sm:p-8">
        <div
          className="print-area mx-auto bg-white shadow-elegant"
          style={{
            width: 794, // A4 width @ 96dpi
            minHeight: 1123,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            marginBottom: `${(1 - zoom) * -800}px`,
          }}
        >
          <Tpl data={data} />
        </div>
      </div>
    </div>
  );
}
