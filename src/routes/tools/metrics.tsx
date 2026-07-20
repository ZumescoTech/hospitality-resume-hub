import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { LogoLockup } from '@/components/ui/LogoLockup';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  FileWarning,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { getMetrics, getUploadFailures } from '@/lib/metrics-api';
import type { DailyMetrics } from '@/lib/telemetry';
import type { DailyUploadFailures, UploadFailureEntry } from '@/lib/upload-failure-types';

export const Route = createFileRoute('/tools/metrics')({
  component: MetricsDashboardPage,
  head: () => ({
    meta: [{ title: 'GetHired — Telemetry Dashboard' }],
  }),
});

function MetricsDashboardPage() {
  const [metrics, setMetrics] = useState<DailyMetrics[]>([]);
  const [uploadFailures, setUploadFailures] = useState<DailyUploadFailures[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  async function loadMetrics() {
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const [metricsData, failuresData] = await Promise.all([
        getMetrics({ data: { days } } as any),
        getUploadFailures({ data: { days } } as any),
      ]);
      setMetrics(metricsData);
      setUploadFailures(failuresData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMetrics();
  }, [days]);

  // Aggregate totals across the selected period
  const totals = metrics.reduce(
    (acc, day) => ({
      checks: acc.checks + day.checksTotal,
      scored: acc.scored + day.scored,
      parseFailures: acc.parseFailures + day.parseFailures + day.insufficientContent,
      apiErrors: acc.apiErrors + day.apiErrors,
    }),
    { checks: 0, scored: 0, parseFailures: 0, apiErrors: 0 },
  );

  const parseFailureRate = totals.checks > 0
    ? ((totals.parseFailures / totals.checks) * 100).toFixed(1)
    : '0.0';

  const apiErrorRate = totals.checks > 0
    ? ((totals.apiErrors / totals.checks) * 100).toFixed(1)
    : '0.0';

  // Latest day's latency
  const latestDay = metrics[0];
  const latencyP50 = latestDay?.latencyP50 ?? null;
  const latencyP95 = latestDay?.latencyP95 ?? null;

  // Score distribution (sum across all days)
  const scoreDistribution: Record<string, number> = {};
  for (const day of metrics) {
    for (const [bucket, count] of Object.entries(day.scoreDistribution)) {
      scoreDistribution[bucket] = (scoreDistribution[bucket] ?? 0) + count;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center">
            <LogoLockup variant="dark" height={36} showWordmark={true} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              Internal
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold">Telemetry Dashboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pipeline health metrics — updated on each CV check.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
            >
              <option value={1}>Today</option>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <Button variant="outline" size="sm" onClick={loadMetrics} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <KpiCard
            icon={<BarChart3 className="h-5 w-5" />}
            label="Total Checks"
            value={totals.checks.toString()}
            sublabel={`${totals.scored} scored`}
          />
          <KpiCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Parse Failure Rate"
            value={`${parseFailureRate}%`}
            sublabel={`${totals.parseFailures} failures`}
            alert={Number(parseFailureRate) > 10}
          />
          <KpiCard
            icon={<Activity className="h-5 w-5" />}
            label="API Error Rate"
            value={`${apiErrorRate}%`}
            sublabel={`${totals.apiErrors} errors`}
            alert={Number(apiErrorRate) > 15}
          />
          <KpiCard
            icon={<Clock className="h-5 w-5" />}
            label="Latency (today)"
            value={latencyP95 != null ? `${(latencyP95 / 1000).toFixed(1)}s` : '—'}
            sublabel={latencyP50 != null ? `p50: ${(latencyP50 / 1000).toFixed(1)}s` : 'No data'}
            alert={latencyP95 != null && latencyP95 > 15000}
          />
        </div>

        {/* Score distribution */}
        <div className="rounded-xl border border-border bg-card p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Score Distribution</h2>
          </div>
          {Object.keys(scoreDistribution).length > 0 ? (
            <ScoreHistogram distribution={scoreDistribution} />
          ) : (
            <p className="text-sm text-muted-foreground">No scored checks in this period.</p>
          )}
        </div>

        {/* Daily breakdown table */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Daily Breakdown</h2>
          </div>
          {metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Checks</th>
                    <th className="pb-2 pr-4">Scored</th>
                    <th className="pb-2 pr-4">Parse Fail</th>
                    <th className="pb-2 pr-4">API Errors</th>
                    <th className="pb-2 pr-4">p50</th>
                    <th className="pb-2">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((day) => (
                    <tr key={day.date} className="border-b border-border/50 last:border-0">
                      <td className="py-2 pr-4 font-medium">{day.date}</td>
                      <td className="py-2 pr-4 tabular-nums">{day.checksTotal}</td>
                      <td className="py-2 pr-4 tabular-nums">{day.scored}</td>
                      <td className={cn('py-2 pr-4 tabular-nums', (day.parseFailures + day.insufficientContent) > 0 && 'text-destructive')}>
                        {day.parseFailures + day.insufficientContent}
                      </td>
                      <td className={cn('py-2 pr-4 tabular-nums', day.apiErrors > 0 && 'text-accent')}>
                        {day.apiErrors}
                      </td>
                      <td className="py-2 pr-4 tabular-nums">
                        {day.latencyP50 != null ? `${(day.latencyP50 / 1000).toFixed(1)}s` : '—'}
                      </td>
                      <td className={cn('py-2 tabular-nums', day.latencyP95 != null && day.latencyP95 > 15000 && 'text-destructive')}>
                        {day.latencyP95 != null ? `${(day.latencyP95 / 1000).toFixed(1)}s` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No data available.</p>
          )}
        </div>
        {/* Upload Failures */}
        <UploadFailuresSection failures={uploadFailures} />
      </main>
    </div>
  );
}

// ─── Upload Failures Section ─────────────────────────────────────────────────

function UploadFailuresSection({ failures }: { failures: DailyUploadFailures[] }) {
  // Aggregate totals across all days
  const totalFailures = failures.reduce((sum, d) => sum + d.total, 0);
  const aggregatedByCode: Record<string, number> = {};
  for (const day of failures) {
    for (const [code, count] of Object.entries(day.byReasonCode)) {
      aggregatedByCode[code] = (aggregatedByCode[code] ?? 0) + count;
    }
  }

  // Collect all recent entries, sorted most recent first
  const allEntries: UploadFailureEntry[] = failures
    .flatMap((d) => d.recentEntries)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 50);

  const sortedCodes = Object.entries(aggregatedByCode).sort((a, b) => b[1] - a[1]);

  return (
    <div className="rounded-xl border border-border bg-card p-5 mt-6">
      <div className="flex items-center gap-2 mb-4">
        <FileWarning className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground">Upload Failures</h2>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {totalFailures} total
        </span>
      </div>

      {totalFailures === 0 ? (
        <p className="text-sm text-muted-foreground">No upload failures in this period.</p>
      ) : (
        <>
          {/* Failure count by reason code */}
          <div className="mb-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              By Reason Code
            </h3>
            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {sortedCodes.map(([code, count]) => (
                <div
                  key={code}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-1.5 text-sm"
                >
                  <span className="font-mono text-xs text-foreground">{code}</span>
                  <span className="font-bold tabular-nums text-destructive">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent failures list */}
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
              Recent Failures
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-2 pr-3">Time</th>
                    <th className="pb-2 pr-3">Session</th>
                    <th className="pb-2 pr-3">Reason</th>
                    <th className="pb-2 pr-3">Stage</th>
                    <th className="pb-2 pr-3">File</th>
                    <th className="pb-2">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {allEntries.map((entry, idx) => (
                    <tr key={`${entry.sessionId}-${idx}`} className="border-b border-border/50 last:border-0">
                      <td className="py-1.5 pr-3 text-xs tabular-nums text-muted-foreground whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-xs text-muted-foreground">
                        {entry.sessionId.slice(0, 8)}
                      </td>
                      <td className="py-1.5 pr-3">
                        <span className="inline-flex rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-medium text-destructive">
                          {entry.reasonCode}
                        </span>
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                        {entry.stage ?? '—'}
                      </td>
                      <td className="py-1.5 pr-3 text-xs text-muted-foreground">
                        .{entry.fileMeta.extension} ({entry.fileMeta.mimeType.split('/')[1] ?? entry.fileMeta.mimeType})
                      </td>
                      <td className="py-1.5 text-xs tabular-nums text-muted-foreground">
                        {entry.fileMeta.size > 0
                          ? `${(entry.fileMeta.size / 1024).toFixed(0)} KB`
                          : '—'}
                        {entry.fileMeta.pageCount != null && ` · ${entry.fileMeta.pageCount}p`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sublabel,
  alert = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sublabel: string;
  alert?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-xl border bg-card p-4 space-y-2',
      alert ? 'border-destructive/40 bg-destructive/5' : 'border-border',
    )}>
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn('text-2xl font-bold tabular-nums', alert && 'text-destructive')}>
        {value}
      </p>
      <p className="text-xs text-muted-foreground">{sublabel}</p>
    </div>
  );
}

function ScoreHistogram({ distribution }: { distribution: Record<string, number> }) {
  const buckets = [
    '0-10', '10-20', '20-30', '30-40', '40-50',
    '50-60', '60-70', '70-80', '80-90', '90-100',
  ];
  const maxCount = Math.max(1, ...Object.values(distribution));

  return (
    <div className="flex items-end gap-1.5 h-32">
      {buckets.map((bucket) => {
        const count = distribution[bucket] ?? 0;
        const height = count > 0 ? Math.max(8, (count / maxCount) * 100) : 4;
        const isLow = bucket === '0-10' || bucket === '10-20';
        const isAlert = isLow && count > 0;

        return (
          <div key={bucket} className="flex-1 flex flex-col items-center gap-1">
            <div className="flex-1 w-full flex items-end">
              <div
                className={cn(
                  'w-full rounded-t transition-all',
                  isAlert ? 'bg-destructive/60' : count > 0 ? 'bg-primary/60' : 'bg-border',
                )}
                style={{ height: `${height}%` }}
                title={`${bucket}: ${count} checks`}
              />
            </div>
            <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
              {bucket.split('-')[0]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
