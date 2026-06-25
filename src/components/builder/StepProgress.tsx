import { cn } from "@/lib/utils";

interface Step {
  id: string;
  label: string;
}

interface Props {
  steps: Step[];
  current: number;
  onJump: (i: number) => void;
  /** Indices of steps that have been completed (user advanced past them). */
  completed?: number[];
  /** When true, wraps in a sticky top-0 bar (used by mobile wizard). */
  stickyMobile?: boolean;
}

export function StepProgress({ steps, current, onJump, completed = [], stickyMobile }: Props) {
  const completedSet = new Set(completed);

  const inner = (
    <div className="flex items-center gap-0">
      {steps.map((s, i) => {
        const isCompleted = completedSet.has(i);
        const isCurrent = i === current;
        const isClickable = isCompleted && !isCurrent;
        const isLast = i === steps.length - 1;

        return (
          <div key={s.id} className="flex items-center">
            {/* Dot */}
            <button
              onClick={() => isClickable ? onJump(i) : undefined}
              disabled={!isClickable && !isCurrent}
              title={s.label}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "relative flex items-center justify-center rounded-full transition-all focus-visible:outline-none focus-visible:ring-focus",
                isCurrent
                  ? "h-7 w-7 bg-primary text-primary-foreground text-xs font-semibold"
                  : isCompleted
                    ? "h-5 w-5 bg-purple-100 text-purple-600 text-[10px] cursor-pointer hover:bg-purple-200"
                    : "h-4 w-4 border-half border-navy-300 bg-white cursor-default",
              )}
            >
              {isCompleted && !isCurrent && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
              {isCurrent && <span>{i + 1}</span>}
            </button>

            {/* Label under current dot */}
            {isCurrent && (
              <span className="ml-2 text-xs font-medium text-foreground whitespace-nowrap">
                {s.label}
              </span>
            )}

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  "mx-1.5 h-px flex-shrink-0 transition-colors",
                  isCurrent ? "w-4" : "w-3",
                  isCompleted ? "bg-purple-300" : "bg-navy-200",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  if (stickyMobile) {
    return (
      <div className="shrink-0 border-b-half border-border bg-background px-4 py-3">
        {inner}
      </div>
    );
  }

  return inner;
}
