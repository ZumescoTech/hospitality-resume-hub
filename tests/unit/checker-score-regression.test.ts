/**
 * Phase 1 must not change local ATS scores, quality gates, or lead-capture shape.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { scoreLocally } from '@/lib/localEngine';
import { parseQualityGate, runDeterministicChecks } from '@/lib/cvDeterministicChecks';
import { parseCvLocally } from '@/lib/cvExtractDeterministic';
import { buildLeadWebhookPayload } from '@/lib/cruise-cv-check';

const DIR = resolve(__dirname, '../fixtures/cvs');
const load = (file: string) => readFileSync(resolve(DIR, file), 'utf8');

const PINNED: Array<{ file: string; roleSlug: string; overall: number; tier: string }> = [
  { file: 'waiter-experienced.txt', roleSlug: 'waiter-waitress', overall: 74, tier: 'Good' },
  { file: 'sommelier-junior.txt', roleSlug: 'sommelier-wine-waiter', overall: 66, tier: 'Needs Work' },
  { file: 'bartender-mid.txt', roleSlug: 'bartender-bar-waiter', overall: 48, tier: 'Major Gaps' },
  { file: 'cabin-steward-thin.txt', roleSlug: 'cabin-steward-stewardess', overall: 24, tier: 'Major Gaps' },
  { file: 'housekeeping-supervisor.txt', roleSlug: 'cabin-steward-stewardess', overall: 61, tier: 'Needs Work' },
  { file: 'weak-generic.txt', roleSlug: 'waiter-waitress', overall: 16, tier: 'Major Gaps' },
];

describe('scoring output is unchanged', () => {
  for (const pin of PINNED) {
    it(`${pin.file} @ ${pin.roleSlug} → ${pin.overall} (${pin.tier})`, () => {
      const result = scoreLocally({ cvText: load(pin.file), roleSlug: pin.roleSlug });
      expect(result.overallScore).toBe(pin.overall);
      expect(result.tier).toBe(pin.tier);
    });
  }
});

describe('quality gate still blocks unreadable CVs', () => {
  it('rejects insufficient content', () => {
    const cv = 'John Smith email phone some words here end';
    const result = parseQualityGate(cv, runDeterministicChecks(cv));
    expect(result?.kind).toBe('insufficient_content');
  });

  it('rejects garbled extraction', () => {
    const garbled = '\x00\x01\x02\x03'.repeat(50) + 'some real text here but mostly garbage ' + '\x00\x01\x02'.repeat(100);
    const result = parseQualityGate(garbled, runDeterministicChecks(garbled));
    expect(result?.kind).toBe('parse_failed');
  });
});

describe('checker still scores when optional parse sections are empty', () => {
  it('scoreLocally does not depend on parseCvLocally filling experience', () => {
    const cv = load('weak-generic.txt');
    const parsed = parseCvLocally(cv);
    const result = scoreLocally({ cvText: cv, roleSlug: 'waiter-waitress' });
    expect(result.overallScore).toBe(16);
    expect(Array.isArray(parsed.experience)).toBe(true);
  });
});

describe('lead capture excludes CV text and full resume data', () => {
  it('webhook payload only contains WhatsApp, role, score, tier and top fixes', () => {
    const payload = buildLeadWebhookPayload({
      whatsapp_number: '+447700900000',
      country_code: 'GB',
      roleSlug: 'waiter-waitress',
      overallScore: 74,
      tier: 'Good',
      topFixes: ['Add Micros POS', 'Quantify covers'],
      opted_in: true,
    });
    const keys = Object.keys(payload).sort();
    expect(keys).toEqual(
      ['country_code', 'created_at', 'opted_in', 'role', 'role_slug', 'score', 'tier', 'top_fixes', 'whatsapp_number'].sort(),
    );
    const blob = JSON.stringify(payload);
    expect(blob).not.toMatch(/cvText|james\.holloway|experience|summary|certifications|resume/i);
    expect(payload.whatsapp_number).toBe('+447700900000');
    expect(payload.top_fixes).toBe('Add Micros POS | Quantify covers');
  });
});

describe('builder direct-upload path is still wired', () => {
  it('builder.tsx still calls parseCvForBuilder for in-builder file import', () => {
    const src = readFileSync(resolve(__dirname, '../../src/routes/builder.tsx'), 'utf8');
    expect(src).toContain('parseCvForBuilder');
    expect(src).toContain('extractTextFromFile');
  });

  it('checker still uses parseCvLocally and does not call parseCvForBuilder', () => {
    const src = readFileSync(resolve(__dirname, '../../src/routes/tools/cruise-cv-checker.tsx'), 'utf8');
    expect(src).toContain('parseCvLocally');
    expect(src).not.toContain('parseCvForBuilder');
  });
});
