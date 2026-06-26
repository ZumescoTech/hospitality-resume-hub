/**
 * BulletEditor
 *
 * A mobile-first bullet-point list editor for experience descriptions.
 * Each bullet is its own auto-resizing textarea row.
 * - Enter in a bullet → adds a new empty bullet below it
 * - Backspace on an empty bullet → removes it and focuses the previous one
 * - "Add point" button below the list
 * - "×" remove button on each row (hidden when only 1 bullet remains)
 */
import { useRef } from "react";

interface BulletEditorProps {
  bullets: string[];
  onChange: (bullets: string[]) => void;
  placeholder?: string;
  maxBullets?: number;
}

export function BulletEditor({
  bullets,
  onChange,
  placeholder = "Describe your responsibilities...",
  maxBullets = 8,
}: BulletEditorProps) {
  const inputRefs = useRef<(HTMLTextAreaElement | null)[]>([]);

  // Always show at least one empty row
  const safeBullets = bullets.length > 0 ? bullets : [""];

  function updateBullet(index: number, value: string) {
    const next = [...safeBullets];
    next[index] = value;
    onChange(next);
  }

  function addBullet(afterIndex: number) {
    if (safeBullets.length >= maxBullets) return;
    const next = [...safeBullets];
    next.splice(afterIndex + 1, 0, "");
    onChange(next);
    setTimeout(() => inputRefs.current[afterIndex + 1]?.focus(), 50);
  }

  function removeBullet(index: number) {
    if (safeBullets.length <= 1) {
      onChange([""]);
      return;
    }
    const next = safeBullets.filter((_, i) => i !== index);
    onChange(next);
    setTimeout(() => {
      inputRefs.current[Math.max(0, index - 1)]?.focus();
    }, 50);
  }

  function handleKeyDown(
    e: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number
  ) {
    if (e.key === "Enter") {
      e.preventDefault();
      addBullet(index);
    }
    if (e.key === "Backspace" && safeBullets[index] === "") {
      e.preventDefault();
      removeBullet(index);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        Highlights{" "}
        <span className="font-normal normal-case">(one point per line)</span>
      </p>

      {safeBullets.map((bullet, index) => (
        <div key={index} className="flex items-start gap-2">
          {/* Bullet dot indicator */}
          <div className="mt-[11px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-border bg-muted">
            <div className="h-[5px] w-[5px] rounded-full bg-primary" />
          </div>

          {/* Auto-resizing textarea */}
          <textarea
            ref={(el) => {
              inputRefs.current[index] = el;
            }}
            value={bullet}
            onChange={(e) => updateBullet(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            placeholder={
              index === 0 ? placeholder : "Add another point..."
            }
            rows={1}
            className="min-h-[40px] flex-1 resize-none overflow-hidden rounded-lg border border-input bg-background px-3 py-2.5 text-sm leading-relaxed outline-none transition-shadow focus:border-primary focus:ring-2 focus:ring-primary/20"
            onInput={(e) => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />

          {/* Remove button — only shown when more than 1 bullet */}
          {safeBullets.length > 1 && (
            <button
              type="button"
              onClick={() => removeBullet(index)}
              aria-label="Remove this point"
              className="mt-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              ×
            </button>
          )}
        </div>
      ))}

      {/* Add bullet */}
      {safeBullets.length < maxBullets && (
        <button
          type="button"
          onClick={() => addBullet(safeBullets.length - 1)}
          className="ml-[26px] self-start text-xs font-medium text-primary hover:underline"
        >
          + Add point
        </button>
      )}

      <p className="ml-[26px] text-[11px] text-muted-foreground">
        Enter to add · Backspace on empty line to remove
      </p>
    </div>
  );
}
