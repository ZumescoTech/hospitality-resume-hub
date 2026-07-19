// metrics-api.ts
// Server function for reading telemetry metrics.
// Intended for internal dashboard use only (no auth for MVP, but only
// returns aggregate counts — no PII or CV content).

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { getMetricsForDate, type DailyMetrics } from '@/lib/telemetry';

const MetricsQuerySchema = z.object({
  /** Number of days to include (default 7, max 30). */
  days: z.number().min(1).max(30).optional().default(7),
});

export type MetricsQuery = z.infer<typeof MetricsQuerySchema>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getMetrics = createServerFn({ method: 'GET' }).handler(async (ctx: any): Promise<DailyMetrics[]> => {
  const { days } = MetricsQuerySchema.parse(ctx.data ?? {});

  const results: DailyMetrics[] = [];
  const now = new Date();

  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    results.push(await getMetricsForDate(dateStr));
  }

  return results;
});
