// debug-log-api.ts
// TEMPORARY server functions behind the /tools/logs page.
// Reading requires the LOGS_TOKEN secret; without it the page is disabled.

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import type { DebugLogEntry } from '@/lib/debug-log';

const ReadSchema = z.object({ token: z.string().min(1) });

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

function tokensMatch(given: string, expected: string): boolean {
  if (given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getDebugLogs = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<DebugLogEntry[]> => {
  const { token } = ReadSchema.parse(ctx.data ?? {});
  const expected = process.env.LOGS_TOKEN;
  if (!expected) throw new Error('Logs page is disabled: LOGS_TOKEN is not set.');
  if (!tokensMatch(token, expected)) throw new Error('Wrong logs token.');

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
