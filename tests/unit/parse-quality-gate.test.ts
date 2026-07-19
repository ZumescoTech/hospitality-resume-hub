import { describe, it, expect } from 'vitest';
import { parseQualityGate, runDeterministicChecks } from '@/lib/cvDeterministicChecks';

describe('parseQualityGate', () => {
  it('returns null for well-formed CV text', () => {
    const cv = `
      John Smith
      john@example.com | +44 7700 900000

      Professional Summary
      Experienced sommelier with 5 years in luxury cruise dining.

      Experience
      Head Sommelier — MSC Cruises (2020–2024)
      • Managed wine list of 200+ labels across 3 restaurants
      • Achieved 95% guest satisfaction scores
      • Trained team of 4 junior sommeliers

      Education
      WSET Level 3 Award in Wines (2019)

      Skills
      Opera PMS, Micros, Wine service, HACCP certified
    `;
    const signals = runDeterministicChecks(cv);
    expect(parseQualityGate(cv, signals)).toBeNull();
  });

  it('returns insufficient_content for very short text', () => {
    const cv = 'John Smith email phone some words here end';
    const signals = runDeterministicChecks(cv);
    const result = parseQualityGate(cv, signals);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('insufficient_content');
  });

  it('returns parse_failed for garbled text with high non-printable ratio', () => {
    // Simulate garbled PDF extraction with lots of non-printable characters
    const garbled = '\x00\x01\x02\x03'.repeat(50) + 'some real text here but mostly garbage ' + '\x00\x01\x02'.repeat(100);
    const signals = runDeterministicChecks(garbled);
    const result = parseQualityGate(garbled, signals);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('parse_failed');
  });

  it('returns parse_failed for garbled run + no structure + short text', () => {
    // 25+ consecutive lowercase chars = garbled detection, plus no headings found
    const garbled = 'abcdefghijklmnopqrstuvwxyzabcdef some text but no structure at all here';
    const signals = runDeterministicChecks(garbled);
    // Should trigger: suspectGarbledText + no headings + low word count
    expect(signals.suspectGarbledText).toBe(true);
    expect(signals.headingsFound.length).toBe(0);
    const result = parseQualityGate(garbled, signals);
    expect(result).not.toBeNull();
    expect(result!.kind).toBe('parse_failed');
  });

  it('allows garbled text if CV has recognizable structure', () => {
    // Has a long garbled run but also has proper headings and length
    const cv = `
      John Smith
      john@example.com

      Experience
      abcdefghijklmnopqrstuvwxyzabcdefg
      Head Waiter — Cunard Line (2019–2023)
      Managed a team of 8 waiters serving 200 covers per shift.
      Achieved 97% guest satisfaction scores consistently.

      Education
      Diploma in Hospitality Management

      Skills
      Opera PMS, Micros, Food safety, HACCP, wine service training completed
    `;
    const signals = runDeterministicChecks(cv);
    expect(signals.suspectGarbledText).toBe(true); // garbled run detected
    const result = parseQualityGate(cv, signals);
    expect(result).toBeNull(); // but gate passes because structure is present
  });
});
