import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface Props {
  steps: Step[];
  current: number;
  onJump: (i: number) => void;
}

export function StepProgress({ steps, current, onJump }: Props) {
  const pct = ((current + 1) / steps.length) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          Step <span className="font-semibold text-foreground">{current + 1}</span> of {steps.length}
        </span>
        <span>{Math.round(pct)}% complete</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {steps.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onJump(i)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              i === current
                ? "border-primary bg-primary text-primary-foreground"
                : i < current
                  ? "border-accent/40 bg-accent/10 text-foreground hover:bg-accent/20"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
