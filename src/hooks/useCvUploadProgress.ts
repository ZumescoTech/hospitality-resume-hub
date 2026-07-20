// useCvUploadProgress.ts
// State machine for the CV checker upload progress bar.
// The 'analyzing' stage drives its own easing animation internally —
// it approaches 95% but never reaches it until the caller calls setStage('done').

import { useCallback, useEffect, useRef, useState } from 'react';

export type ProgressStage = 'idle' | 'reading' | 'extracting' | 'analyzing' | 'done' | 'error';

const STAGE_LABELS: Record<ProgressStage, string> = {
  idle: '',
  reading: 'Reading file...',
  extracting: 'Extracting text...',
  analyzing: 'Analyzing your CV...',
  done: 'Done',
  error: "Couldn't process file",
};

interface ProgressState {
  stage: ProgressStage;
  percent: number;
  label: string;
}

export interface ProgressHook extends ProgressState {
  /** Transition to a new stage. For 'analyzing', pass the starting percent (e.g. 70). */
  setStage: (stage: ProgressStage, startPercent?: number) => void;
  /** Update percent mid-stage (used by extraction callbacks). */
  setPercent: (percent: number) => void;
  /** Override the label mid-stage (e.g. switching to OCR label). */
  setLabel: (label: string) => void;
  /** Reset to idle and cancel any running animation. */
  reset: () => void;
  /** Current stage name (alias for stage, used by error telemetry). */
  currentStage: ProgressStage;
}

const IDLE: ProgressState = { stage: 'idle', percent: 0, label: '' };

// Analyzing easing: each tick covers DECAY fraction of the remaining distance to 95%.
// At 200ms intervals with DECAY=0.07: fast start, asymptotically slows near 95%.
const TICK_MS = 200;
const DECAY = 0.07;

export function useCvUploadProgress(): ProgressHook {
  const [state, setState] = useState<ProgressState>(IDLE);
  const timerRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== undefined) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const setStage = useCallback(
    (stage: ProgressStage, startPercent?: number) => {
      clearTimer();

      const label = STAGE_LABELS[stage];
      // 'error' clears percent; all other stages use startPercent or 0.
      const percent = stage === 'error' ? 0 : (startPercent ?? 0);

      setState({ stage, percent, label });

      if (stage === 'analyzing') {
        // Easing animation: approaches 95% asymptotically, never auto-completes.
        timerRef.current = setInterval(() => {
          setState((prev) => {
            if (prev.stage !== 'analyzing') return prev;
            const remaining = 95 - prev.percent;
            const delta = Math.max(remaining * DECAY, 0.05);
            return { ...prev, percent: Math.min(95, prev.percent + delta) };
          });
        }, TICK_MS);
      }
    },
    [clearTimer],
  );

  const setPercent = useCallback((percent: number) => {
    setState((prev) => ({ ...prev, percent }));
  }, []);

  const setLabel = useCallback((label: string) => {
    setState((prev) => ({ ...prev, label }));
  }, []);

  const reset = useCallback(() => {
    clearTimer();
    setState(IDLE);
  }, [clearTimer]);

  // Cancel animation on unmount.
  useEffect(() => clearTimer, [clearTimer]);

  return { ...state, setStage, setPercent, setLabel, reset, currentStage: state.stage };
}
