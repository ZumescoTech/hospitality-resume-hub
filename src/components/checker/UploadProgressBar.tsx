// UploadProgressBar.tsx
// Horizontal progress bar for the CV upload/analysis pipeline.
// Hides when stage is 'idle'. Shows an error state (no fill bar) on 'error'.
// Width transitions are CSS-driven (200ms ease-out) to smooth stage jumps.

import { cn } from '@/lib/utils';
import type { ProgressStage } from '@/hooks/useCvUploadProgress';

interface Props {
  stage: ProgressStage;
  percent: number;
  label: string;
  className?: string;
}

export function UploadProgressBar({ stage, percent, label, className }: Props) {
  if (stage === 'idle') return null;

  const isError = stage === 'error';
  const isDone = stage === 'done';
  const roundedPercent = Math.round(percent);

  return (
    <div className={cn('space-y-1.5', className)} aria-live="polite">
      <div className="flex items-center justify-between gap-2">
        <p
          className={cn(
            'text-xs font-medium',
            isError ? 'text-destructive' : isDone ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          {label}
        </p>
        {!isError && (
          <span className="text-xs tabular-nums text-muted-foreground">
            {roundedPercent}%
          </span>
        )}
      </div>

      {!isError && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            role="progressbar"
            aria-valuenow={roundedPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={label}
            className={cn(
              'h-full rounded-full transition-[width] duration-200 ease-out',
              isDone ? 'bg-primary' : 'bg-primary/70',
            )}
            style={{ width: `${roundedPercent}%` }}
          />
        </div>
      )}
    </div>
  );
}
