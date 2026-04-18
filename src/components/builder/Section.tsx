import { ComponentType, ReactNode, useState } from "react";
import { ChevronDown, LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  subtitle?: string;
  step: number;
  icon?: ComponentType<LucideProps>;
  children: ReactNode;
  defaultOpen?: boolean;
  active?: boolean;
}

export function Section({ title, subtitle, step, icon: Icon, children, defaultOpen = true, active }: Props) {
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
          <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {Icon ? <Icon className="h-4 w-4" /> : <span className="text-xs font-semibold">{step}</span>}
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-background text-[10px] font-semibold text-foreground ring-1 ring-border">
              {step}
            </span>
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
