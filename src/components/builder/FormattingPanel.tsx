import { cn } from "@/lib/utils";
import {
  FormattingSettings,
  FONT_FAMILIES,
  MARGIN_PRESETS,
  FORMATTING_PRESETS,
  defaultFormatting,
} from "@/types/formatting";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

interface Props {
  settings: FormattingSettings;
  onChange: (settings: FormattingSettings) => void;
}

function patch(settings: FormattingSettings, update: Partial<FormattingSettings>): FormattingSettings {
  return { ...settings, ...update };
}

export function FormattingPanel({ settings, onChange }: Props) {
  const fmt = settings ?? defaultFormatting;

  return (
    <div className="space-y-5 px-4 pb-4 pt-3">
      {/* ── Presets ─────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Presets
        </p>
        <div className="flex gap-2">
          {FORMATTING_PRESETS.map((preset) => {
            const active =
              fmt.fontFamily === preset.settings.fontFamily &&
              fmt.bodyFontSize === preset.settings.bodyFontSize &&
              fmt.lineSpacing === preset.settings.lineSpacing &&
              fmt.marginInches === preset.settings.marginInches;
            return (
              <button
                key={preset.name}
                onClick={() => onChange(preset.settings)}
                className={cn(
                  "flex-1 rounded-lg border px-3 py-2 text-left transition-all",
                  active
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                <p className="text-xs font-semibold">{preset.name}</p>
                <p className="text-[10px] text-muted-foreground">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Font Family ─────────────────────────────────────── */}
      <div>
        <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Font Family
        </label>
        <Select
          value={fmt.fontFamily}
          onValueChange={(v) => onChange(patch(fmt, { fontFamily: v as FormattingSettings["fontFamily"] }))}
        >
          <SelectTrigger className="h-9 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="mt-1 text-[10px] text-muted-foreground">
          ATS-safe fonts only. These render correctly in all tracking systems.
        </p>
      </div>

      {/* ── Body Font Size ──────────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Body Text Size
          </label>
          <span className="text-xs font-medium tabular-nums">
            {fmt.bodyFontSize}pt
            {fmt.bodyFontSize <= 10.5 && (
              <span className="ml-1.5 text-[10px] text-amber-500">minimum — small</span>
            )}
          </span>
        </div>
        <Slider
          min={10.5}
          max={12}
          step={0.5}
          value={[fmt.bodyFontSize]}
          onValueChange={([v]) => onChange(patch(fmt, { bodyFontSize: v }))}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>10.5pt</span>
          <span>12pt</span>
        </div>
      </div>

      {/* ── Heading Font Size ───────────────────────────────── */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Section Heading Size
          </label>
          <span className="text-xs font-medium tabular-nums">{fmt.headingFontSize}pt</span>
        </div>
        <Slider
          min={14}
          max={16}
          step={0.5}
          value={[fmt.headingFontSize]}
          onValueChange={([v]) => onChange(patch(fmt, { headingFontSize: v }))}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>14pt</span>
          <span>16pt</span>
        </div>
      </div>

      {/* ── Line Spacing ────────────────────────────────────── */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Line Spacing
        </p>
        <div className="flex gap-2">
          {([1.15, 1.2] as const).map((val) => (
            <button
              key={val}
              onClick={() => onChange(patch(fmt, { lineSpacing: val }))}
              className={cn(
                "flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                fmt.lineSpacing === val
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {val === 1.15 ? "Compact (1.15)" : "Comfortable (1.2)"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Margins ─────────────────────────────────────────── */}
      <div>
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Page Margins
        </p>
        <div className="flex gap-2">
          {MARGIN_PRESETS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => onChange(patch(fmt, { marginInches: value }))}
              className={cn(
                "flex-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition-all",
                fmt.marginInches === value
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border text-muted-foreground hover:border-primary/40",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Reset ───────────────────────────────────────────── */}
      <Button
        variant="ghost"
        size="sm"
        className="w-full text-xs text-muted-foreground"
        onClick={() => onChange(defaultFormatting)}
      >
        Reset to defaults
      </Button>
    </div>
  );
}
