// TEMPORARY debug page: every captured server log and browser error.
// Protected by the LOGS_TOKEN secret. Remove with src/lib/debug-log*.ts,
// src/lib/client-log-capture.ts and src/start.ts when no longer needed.

import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDebugLogs } from '@/lib/debug-log-api';
import type { DebugLogEntry, LogLevel, LogSource } from '@/lib/debug-log';

export const Route = createFileRoute('/tools/logs')({
  component: LogsPage,
  head: () => ({
    meta: [{ title: 'GetHired — Logs' }, { name: 'robots', content: 'noindex, nofollow' }],
  }),
});

const TOKEN_KEY = 'gethired-logs-token';
const LEVEL_STYLES: Record<LogLevel, string> = {
  error: 'bg-destructive/10 text-destructive',
  warn: 'bg-amber-500/10 text-amber-700',
  log: 'bg-muted text-muted-foreground',
  info: 'bg-muted text-muted-foreground',
  debug: 'bg-muted text-muted-foreground',
};

function readStoredToken(): string {
  try {
    return sessionStorage.getItem(TOKEN_KEY) ?? '';
  } catch {
    return '';
  }
}

function LogsPage() {
  const [token, setToken] = useState('');
  const [entries, setEntries] = useState<DebugLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [level, setLevel] = useState<'all' | 'problems' | LogLevel>('all');
  const [source, setSource] = useState<'all' | LogSource>('all');
  const [search, setSearch] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(false);

  async function load(withToken = token) {
    if (!withToken) return;
    setLoading(true);
    setError(null);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await getDebugLogs({ data: { token: withToken } } as any);
      setEntries(data);
      setLoaded(true);
      try {
        sessionStorage.setItem(TOKEN_KEY, withToken);
      } catch {
        // sessionStorage unavailable — token just isn't remembered.
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const stored = readStoredToken();
    if (stored) {
      setToken(stored);
      void load(stored);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!autoRefresh || !loaded) return;
    const id = setInterval(() => void load(), 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, loaded, token]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return entries.filter((e) => {
      if (source !== 'all' && e.source !== source) return false;
      if (level === 'problems' && e.level !== 'error' && e.level !== 'warn') return false;
      if (level !== 'all' && level !== 'problems' && e.level !== level) return false;
      return !q || e.message.toLowerCase().includes(q);
    });
  }, [entries, level, source, search]);

  const errorCount = entries.filter((e) => e.level === 'error').length;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6">
          <h1 className="font-display text-2xl font-bold">Logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Server logs and browser errors from the last 3 days, newest first. New entries can take up to a minute to appear.
          </p>
        </div>

        <form
          className="mb-6 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void load();
          }}
        >
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Logs token"
            autoComplete="off"
            className="w-full rounded-lg border border-border bg-card px-3 py-1.5 text-sm sm:w-64"
          />
          <Button type="submit" size="sm" disabled={!token || loading}>
            {loaded ? 'Reload' : 'Open logs'}
          </Button>
        </form>

        {error && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {loaded && (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value as typeof level)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
              >
                <option value="all">All levels</option>
                <option value="problems">Errors + warnings</option>
                <option value="error">Errors</option>
                <option value="warn">Warnings</option>
                <option value="log">Log</option>
                <option value="info">Info</option>
              </select>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as typeof source)}
                className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
              >
                <option value="all">Server + browser</option>
                <option value="server">Server</option>
                <option value="client">Browser</option>
              </select>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search, e.g. ai-router"
                className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm"
              />
              <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                Auto-refresh
              </label>
              <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading} aria-label="Refresh">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
            </div>

            <p className="mb-2 text-xs text-muted-foreground">
              Showing {visible.length} of {entries.length} entries · {errorCount} errors
            </p>

            <div className="overflow-hidden rounded-xl border border-border bg-card">
              {visible.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">No log entries match.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((e, i) => (
                    <li key={`${e.ts}-${i}`} className="flex flex-col gap-1 px-4 py-2.5 sm:flex-row sm:gap-3">
                      <div className="flex shrink-0 items-center gap-2 sm:w-64">
                        <span className="font-mono text-xs text-muted-foreground">
                          {new Date(e.ts).toLocaleString()}
                        </span>
                        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', LEVEL_STYLES[e.level])}>
                          {e.level}
                        </span>
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {e.source === 'client' ? 'browser' : 'server'}
                        </span>
                      </div>
                      <pre className="min-w-0 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                        {e.message}
                      </pre>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
