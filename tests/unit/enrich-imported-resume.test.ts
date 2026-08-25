/**
 * Phase 2 — gated AI enrichment fills only empty builder sections.
 * Default OFF: extract() is never called. Scoring is not involved.
 */
import { describe, it, expect, vi } from 'vitest';
import { emptyResume } from '@/types/resume';
import { makeResume } from '../helpers/handoff-fixtures';
import {
  isImportAiEnrichEnabled,
  mergeSparseAiExtract,
  enrichImportedResume,
} from '@/lib/enrich-imported-resume';

const local = makeResume();
const ai = makeResume({
  summary: 'AI wrote a different summary that must not replace a local one.',
  experience: [
    {
      id: 'ai-e1',
      role: 'AI Invented Role',
      venue: 'Hallucinated Hotel',
      location: '',
      startDate: '2010',
      endDate: '2011',
      description: 'Made up.',
    },
  ],
  hospitality: {
    serviceStyles: ['Banquet'],
    posSystems: ['Lightspeed'],
    wineKnowledge: 'Beginner',
    spiritsKnowledge: 'Mixologist',
    languages: [{ name: 'Spanish', level: 'Conversational' }],
    allergens: false,
    foodSafety: 'ServSafe',
  },
});

describe('isImportAiEnrichEnabled', () => {
  it('is off unless IMPORT_AI_ENRICH is the string true', () => {
    expect(isImportAiEnrichEnabled({})).toBe(false);
    expect(isImportAiEnrichEnabled({ IMPORT_AI_ENRICH: 'false' })).toBe(false);
    expect(isImportAiEnrichEnabled({ IMPORT_AI_ENRICH: 'true' })).toBe(true);
  });
});

describe('mergeSparseAiExtract', () => {
  it('keeps local experience, summary and contact when they are already filled', () => {
    const merged = mergeSparseAiExtract(local, ai);
    expect(merged.experience[0].role).toBe('Senior Waiter');
    expect(merged.experience.some((e) => e.role === 'AI Invented Role')).toBe(false);
    expect(merged.summary).toBe(local.summary);
    expect(merged.personal.email).toBe(local.personal.email);
  });

  it('fills empty hospitality slots from AI without wiping local POS', () => {
    const partial = makeResume({
      hospitality: {
        ...emptyResume.hospitality,
        posSystems: ['Micros'],
        wineKnowledge: 'None',
        spiritsKnowledge: 'None',
        languages: [{ name: 'English', level: 'Fluent' }],
        serviceStyles: [],
        allergens: false,
        foodSafety: '',
      },
    });
    const merged = mergeSparseAiExtract(partial, ai);
    expect(merged.hospitality.posSystems).toContain('Micros');
    expect(merged.hospitality.posSystems).toContain('Lightspeed');
    expect(merged.hospitality.wineKnowledge).toBe('Beginner');
    expect(merged.hospitality.spiritsKnowledge).toBe('Mixologist');
    expect(merged.hospitality.serviceStyles).toContain('Banquet');
  });

  it('uses AI experience only when the local parse found none', () => {
    const thin = { ...local, experience: [] };
    const merged = mergeSparseAiExtract(thin, ai);
    expect(merged.experience).toHaveLength(1);
    expect(merged.experience[0].role).toBe('AI Invented Role');
  });
});

describe('enrichImportedResume', () => {
  const cvText = 'A CV body that is definitely longer than fifty characters for the enrich path.';

  it('does not call extract when the flag is off', async () => {
    const extract = vi.fn(async () => ai);
    const result = await enrichImportedResume(local, cvText, {
      enabled: false,
      extract,
    });
    expect(extract).not.toHaveBeenCalled();
    expect(result).toEqual(local);
  });

  it('merges AI into empty sections when the flag is on', async () => {
    const extract = vi.fn(async () => ai);
    const thin = { ...local, experience: [] as typeof local.experience };
    const result = await enrichImportedResume(thin, cvText, {
      enabled: true,
      extract,
    });
    expect(extract).toHaveBeenCalledOnce();
    expect(result.experience[0].role).toBe('AI Invented Role');
    expect(result.personal.fullName).toBe(local.personal.fullName);
  });

  it('returns the local resume when extract throws', async () => {
    const extract = vi.fn(async () => {
      throw new Error('provider down');
    });
    const result = await enrichImportedResume(local, cvText, {
      enabled: true,
      extract,
    });
    expect(result).toEqual(local);
  });
});
