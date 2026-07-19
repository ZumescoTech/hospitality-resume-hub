import { describe, it, expect } from 'vitest';
import { recordCheckOutcome, recordApiAttempt, recordLatencyMs, getMetricsForDate } from '@/lib/telemetry';

describe('telemetry (KV unavailable — graceful no-op)', () => {
  it('recordCheckOutcome does not throw when KV is absent', () => {
    expect(() => recordCheckOutcome('scored', 75)).not.toThrow();
    expect(() => recordCheckOutcome('parse_failed')).not.toThrow();
    expect(() => recordCheckOutcome('insufficient_content')).not.toThrow();
  });

  it('recordApiAttempt does not throw when KV is absent', () => {
    expect(() => recordApiAttempt('groq', 'ok', 250)).not.toThrow();
    expect(() => recordApiAttempt('gemini', 'rate_limit', 1200)).not.toThrow();
    expect(() => recordApiAttempt('groq', 'exhausted', 5000)).not.toThrow();
  });

  it('recordLatencyMs does not throw when KV is absent', () => {
    expect(() => recordLatencyMs(1500)).not.toThrow();
  });

  it('getMetricsForDate returns zeroed metrics when KV is absent', async () => {
    const metrics = await getMetricsForDate('2026-07-19');
    expect(metrics.date).toBe('2026-07-19');
    expect(metrics.checksTotal).toBe(0);
    expect(metrics.parseFailures).toBe(0);
    expect(metrics.scored).toBe(0);
    expect(metrics.apiErrors).toBe(0);
    expect(metrics.latencyP50).toBeNull();
    expect(metrics.latencyP95).toBeNull();
  });
});
