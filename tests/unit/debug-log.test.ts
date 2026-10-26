/**
 * Temporary /tools/logs capture: redaction, gating, console capture, KV round-trip.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { env } from 'cloudflare:workers';
import {
  sanitizeLogMessage,
  formatLogArgs,
  pushDebugLog,
  drainDebugLogBuffer,
  installConsoleCapture,
  flushDebugLogs,
  readDebugLogs,
} from '@/lib/debug-log';

function makeKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => void store.set(k, v)),
    list: vi.fn(async ({ prefix, limit }: { prefix: string; limit?: number }) => ({
      keys: [...store.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name })),
    })),
  };
}

beforeEach(() => {
  process.env.DEBUG_LOGS_ENABLED = 'true';
  drainDebugLogBuffer();
});

afterEach(() => {
  delete process.env.DEBUG_LOGS_ENABLED;
  delete (env as Record<string, unknown>).CV_RESULT_CACHE;
});

describe('sanitizeLogMessage', () => {
  it('redacts emails, phone numbers and API keys', () => {
    const out = sanitizeLogMessage(
      'jane.doe@example.com +27 82 555 0199 ?key=AIzaSyFAKE123456 Bearer gsk_FAKEFAKEFAKE gsk_abcdefghijkl',
    );
    expect(out).not.toMatch(/jane\.doe|555 0199|AIzaSyFAKE|gsk_FAKE|gsk_abcdef/);
    expect(out).toContain('[email]');
    expect(out).toContain('[phone]');
    expect(out).toContain('key=REDACTED');
  });

  it('truncates long messages', () => {
    expect(sanitizeLogMessage('x'.repeat(5000)).length).toBe(1000);
  });

  it('keeps router failure lines readable', () => {
    expect(sanitizeLogMessage('[ai-router] groq server_error 412ms — 401: Invalid API Key')).toBe(
      '[ai-router] groq server_error 412ms — 401: Invalid API Key',
    );
  });
});

describe('formatLogArgs', () => {
  it('formats errors with name and message', () => {
    expect(formatLogArgs(['failed:', new TypeError('boom')])).toContain('TypeError: boom');
  });
});

describe('capture gating', () => {
  it('records nothing when DEBUG_LOGS_ENABLED is not "true"', () => {
    process.env.DEBUG_LOGS_ENABLED = 'false';
    pushDebugLog('error', 'server', 'hidden');
    expect(drainDebugLogBuffer()).toEqual([]);
  });

  it('captures console output while still calling the original', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    installConsoleCapture();
    console.error('[test] something broke');
    const entries = drainDebugLogBuffer();
    expect(entries.some((e) => e.level === 'error' && e.message === '[test] something broke')).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('KV round-trip', () => {
  it('flushes batches and reads them back newest first', async () => {
    const kv = makeKv();
    (env as Record<string, unknown>).CV_RESULT_CACHE = kv;

    pushDebugLog('log', 'server', 'first');
    await flushDebugLogs();
    await new Promise((r) => setTimeout(r, 5));
    pushDebugLog('error', 'client', 'second');
    await flushDebugLogs();

    expect(kv.put).toHaveBeenCalledTimes(2);
    expect(kv.put.mock.calls[0][2]).toEqual({ expirationTtl: 3 * 24 * 60 * 60 });
    const entries = await readDebugLogs();
    expect(entries.map((e) => e.message)).toEqual(['second', 'first']);
  });

  it('does not write when the buffer is empty', async () => {
    const kv = makeKv();
    (env as Record<string, unknown>).CV_RESULT_CACHE = kv;
    await flushDebugLogs();
    expect(kv.put).not.toHaveBeenCalled();
  });
});
