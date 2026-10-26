// client-log-capture.ts
// TEMPORARY browser capture for the /tools/logs page: uncaught errors,
// unhandled promise rejections, console.warn/error and every error toast are
// batched and posted to the server. Capped per page load so a loop of errors
// can't flood KV. Messages are sanitised server-side before storage.

import { toast } from 'sonner';
import { reportClientLogs } from '@/lib/debug-log-api';

type Level = 'warn' | 'error';

const MAX_PER_PAGE_LOAD = 50;
const FLUSH_DELAY_MS = 2000;

let installed = false;
let sent = 0;
let sending = false;
let queue: Array<{ level: Level; message: string }> = [];
let timer: ReturnType<typeof setTimeout> | undefined;

function describe(value: unknown): string {
  if (value instanceof Error) return `${value.name}: ${value.message}${value.stack ? ` | ${value.stack.split('\n').slice(1, 4).join(' | ')}` : ''}`;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function enqueue(level: Level, message: string) {
  if (sending || sent + queue.length >= MAX_PER_PAGE_LOAD) return;
  queue.push({ level, message: `${location.pathname} — ${message}`.slice(0, 4000) });
  if (!timer) timer = setTimeout(flush, FLUSH_DELAY_MS);
}

async function flush() {
  timer = undefined;
  const batch = queue.splice(0, 20);
  if (batch.length === 0) return;
  sent += batch.length;
  sending = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await reportClientLogs({ data: { entries: batch } } as any);
  } catch {
    // Reporting is best-effort.
  } finally {
    sending = false;
    if (queue.length > 0 && !timer) timer = setTimeout(flush, FLUSH_DELAY_MS);
  }
}

export function installClientLogCapture(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (e) => {
    enqueue('error', `Uncaught: ${describe(e.error ?? e.message)}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    enqueue('error', `Unhandled rejection: ${describe(e.reason)}`);
  });

  for (const level of ['warn', 'error'] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      enqueue(level, `console.${level}: ${args.map(describe).join(' ')}`);
    };
  }

  const originalToastError = toast.error;
  toast.error = ((message: unknown, ...rest: unknown[]) => {
    enqueue('error', `Toast shown: ${describe(message)}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (originalToastError as any)(message, ...rest);
  }) as typeof toast.error;
}
