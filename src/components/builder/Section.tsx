import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  step: number;
  children: ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
}

export function Section({ title, subtitle, step, children, defaultOpen = true, active }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section
      id={`section-${step}`}
      className={cn(
        "rounded-xl border bg-card transition-all",
        active ? "border-primary/40 shadow-soft" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {step}
          </span>
          <div>
            <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        <ChevronDown
          className={cn("h-5 w-5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>
      {open && <div className="space-y-4 border-t border-border px-5 py-5">{children}</div>}
    </section>
  );
}
