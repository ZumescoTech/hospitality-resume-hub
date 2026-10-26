// debug-log-api.ts
// TEMPORARY server functions behind the /tools/logs page.
// Intentionally unauthenticated (owner's call, temporary page) — entries are
// redacted before storage. Turn capture off with DEBUG_LOGS_ENABLED=false.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { DebugLogEntry } from '@/lib/debug-log';

const ClientLogsSchema = z.object({
  entries: z
    .array(
      z.object({
        level: z.enum(['debug', 'info', 'log', 'warn', 'error']),
        message: z.string().max(4000),
      }),
    )
    .max(20),
});

export const getDebugLogs = createServerFn({ method: 'POST' }).handler(async (): Promise<DebugLogEntry[]> => {
  const { isDebugLogsEnabled, readDebugLogs } = await import('@/lib/debug-log');
  if (!isDebugLogsEnabled()) throw new Error('Log capture is off: set DEBUG_LOGS_ENABLED=true.');
  return readDebugLogs();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const reportClientLogs = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<void> => {
  const { entries } = ClientLogsSchema.parse(ctx.data ?? {});
  const { pushDebugLog } = await import('@/lib/debug-log');
  for (const e of entries) pushDebugLog(e.level, 'client', e.message);
  // Flushed by the request middleware in src/start.ts.
});
