// TemplateColourPicker.tsx
// Colour customisation UI for CV templates with colour support.
// Renders colour slot rows with HexColorPicker + preset swatches + reset button.

import { useState } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import { RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TemplateColours,
  COLOUR_SLOT_LABELS,
  TEMPLATE_COLOUR_DEFAULTS,
} from '@/lib/template-colours';

interface Props {
  templateId: string;
  colours: TemplateColours;
  onChange: (slot: keyof TemplateColours, value: string) => void;
  onReset: () => void;
}

const PRESET_PALETTES: { label: string; colours: TemplateColours }[] = [
  {
    label: 'Violet',
    colours: { primary: '#7c3aed', accent: '#a78bfa', text: '#334155', background: '#ffffff' },
  },
  {
    label: 'Teal',
    colours: { primary: '#0d9488', accent: '#2dd4bf', text: '#1e3a3a', background: '#ffffff' },
  },
  {
    label: 'Navy',
    colours: { primary: '#1e40af', accent: '#60a5fa', text: '#1e293b', background: '#ffffff' },
  },
  {
    label: 'Slate',
    colours: { primary: '#475569', accent: '#94a3b8', text: '#1e293b', background: '#ffffff' },
  },
  {
    label: 'Gold',
    colours: { primary: '#b45309', accent: '#f59e0b', text: '#292524', background: '#fffbeb' },
  },
  {
    label: 'Noir',
    colours: { primary: '#7c3aed', accent: '#a78bfa', text: '#e2e8f0', background: '#0f172a' },
  },
];

const SLOTS = Object.keys(COLOUR_SLOT_LABELS) as (keyof TemplateColours)[];

export function TemplateColourPicker({ templateId, colours, onChange, onReset }: Props) {
  const [activeSlot, setActiveSlot] = useState<keyof TemplateColours | null>(null);
  const defaults = TEMPLATE_COLOUR_DEFAULTS[templateId];
  const isDefault = defaults
    ? SLOTS.every((s) => colours[s] === defaults[s])
    : false;

  return (
    <div className="space-y-3 p-3">
      {/* Preset palettes */}
      <div>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Presets
        </p>
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PALETTES.map((p) => (
            <button
              key={p.label}
              type="button"
              title={p.label}
              onClick={() => {
                SLOTS.forEach((s) => onChange(s, p.colours[s]));
                setActiveSlot(null);
              }}
              className="flex h-6 w-10 overflow-hidden rounded-sm border border-border hover:border-primary/60 transition-colors"
            >
              <span className="flex-1" style={{ background: p.colours.primary }} />
              <span className="w-1/3" style={{ background: p.colours.background }} />
            </button>
          ))}
        </div>
      </div>

      {/* Colour slot rows */}
      <div className="space-y-1">
        {SLOTS.map((slot) => (
          <div key={slot}>
            <button
              type="button"
              onClick={() => setActiveSlot(activeSlot === slot ? null : slot)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
                activeSlot === slot
                  ? 'bg-primary/5 border border-primary/30'
                  : 'hover:bg-accent border border-transparent',
              )}
            >
              {/* Colour swatch */}
              <span
                className="h-5 w-5 shrink-0 rounded border border-black/10"
                style={{ background: colours[slot] }}
              />
              <span className="flex-1 text-left text-xs font-medium text-foreground">
                {COLOUR_SLOT_LABELS[slot]}
              </span>
              <span className="font-mono text-[10px] uppercase text-muted-foreground">
                {colours[slot]}
              </span>
            </button>

            {/* Inline picker — shown when slot is active */}
            {activeSlot === slot && (
              <div className="mt-1.5 rounded-lg border border-border bg-background p-3 shadow-sm">
                <HexColorPicker
                  color={colours[slot]}
                  onChange={(v) => onChange(slot, v)}
                  style={{ width: '100%', height: 140 }}
                />
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#</span>
                  <HexColorInput
                    color={colours[slot]}
                    onChange={(v) => onChange(slot, v)}
                    prefixed={false}
                    className="h-7 w-full rounded border border-border bg-transparent px-2 font-mono text-xs uppercase text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Reset button */}
      {!isDefault && (
        <button
          type="button"
          onClick={() => { onReset(); setActiveSlot(null); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset to defaults
        </button>
      )}
    </div>
  );
}
