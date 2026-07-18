/**
 * B-1 Scoring Fixture Suite
 *
 * Integration tests that call the real Groq API (via GROQ_API_KEY env var).
 * Skipped automatically when no key is present (e.g. standard CI unit pass).
 * Run with GROQ_API_KEY set to execute against live fixtures.
 *
 * Tolerance policy (§3.1): median of 3 runs must be in band; no single run
 * may be more than 10 points outside band; ranking must hold on ALL 3 runs.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { join } from 'path';
import { loadFixtures, type CvFixture } from '../fixtures/cv-scoring/loader';
import {
  buildCvCheckPrompt,
  parseCvCheckResponse,
  computeCvScore,
  CATEGORY_WEIGHTS,
  type CvScoreResult,
  type CategoryKey,
} from '@/lib/cruiseCvRubric';
import { runDeterministicChecks, scoreKeywordAlignment } from '@/lib/cvDeterministicChecks';
// @ts-ignore
import cruiseRolesRaw from '@/data/cruise-roles.json';

const GROQ_KEY = process.env.GROQ_API_KEY;
const FIXTURES_DIR = join(import.meta.dirname ?? __dirname, '../fixtures/cv-scoring');

// ─── Fixture IDs in expected ranking order (best → worst) ────────────────────

const RANKED_IDS = [
  'sommelier-cv5-sommelier-strongest',
  'sommelier-cv4-sommelier-winewaiter-cunard',
  'sommelier-cv3-winesteward-weakest',
  'sommelier-cv6-weak-on-topic-entry-level',
  'sommelier-cv7-negative-control-office-admin',
];

// ─── Deterministic unit tests (no API key needed) ────────────────────────────

describe('B-1 T4: anti-zero regression (deterministic)', () => {
  it('computeCvScore never returns 0 when given valid LLM-like scores', () => {
    // Simulate worst-case on-topic CV — low scores but not 0
    const lowRaw = {
      keywordAlignment:       { score: 12, feedback: 'Almost no matches.' },
      experienceDepth:        { score: 8,  feedback: 'No relevant experience.' },
      quantifiedAchievements: { score: 5,  feedback: 'None.' },
      qualifications:         { score: 5,  feedback: 'None.' },
      cruiseReadiness:        { score: 0,  feedback: 'No seafarer documents.' },
      atsParseability:        { score: 40, feedback: 'Readable but sparse.' },
      summaryQuality:         { score: 10, feedback: 'Generic.' },
      topFixes: ['Obtain WSET Level 2', 'Add cruise ship experience'],
    };
    const result = computeCvScore(lowRaw, [], []);
    expect(result.overallScore).toBeGreaterThan(0);
  });
});

describe('B-1 T6: headline == weighted sum (deterministic)', () => {
  it('computeCvScore headline equals the §2 weighted sum for all seven categories', () => {
    const raw = {
      keywordAlignment:       { score: 70, feedback: 'ok' },
      experienceDepth:        { score: 65, feedback: 'ok' },
      quantifiedAchievements: { score: 50, feedback: 'ok' },
      qualifications:         { score: 60, feedback: 'ok' },
      cruiseReadiness:        { score: 30, feedback: 'ok' },
      atsParseability:        { score: 80, feedback: 'ok' },
      summaryQuality:         { score: 65, feedback: 'ok' },
      topFixes: ['Fix A', 'Fix B'],
    };
    const result = computeCvScore(raw, [], []);
    const keys = Object.keys(CATEGORY_WEIGHTS) as CategoryKey[];
    const expected = Math.round(
      keys.reduce((acc, k) => acc + (raw[k]?.score ?? 50) * CATEGORY_WEIGHTS[k], 0)
    );
    expect(result.overallScore).toBe(expected);
  });

  it('CATEGORY_WEIGHTS sum to exactly 1.00', () => {
    const total = Object.values(CATEGORY_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 10);
  });

  it('cruiseReadiness weight is 0.10 (B-1 §2 requirement)', () => {
    expect(CATEGORY_WEIGHTS.cruiseReadiness).toBe(0.10);
  });

  it('experienceDepth weight is 0.25 (B-1 §2 requirement, up from 0.15)', () => {
    expect(CATEGORY_WEIGHTS.experienceDepth).toBe(0.25);
  });
});

describe('B-1: fixture files are loadable and well-formed', () => {
  let fixtures: CvFixture[];

  beforeAll(() => {
    fixtures = loadFixtures(FIXTURES_DIR);
  });

  it('loads exactly 5 fixture files', () => {
    expect(fixtures).toHaveLength(5);
  });

  it('all five expected IDs are present', () => {
    const ids = fixtures.map((f) => f.id);
    for (const id of RANKED_IDS) {
      expect(ids).toContain(id);
    }
  });

  it('every fixture has a non-empty cvText', () => {
    for (const f of fixtures) {
      expect(f.cvText.length).toBeGreaterThan(50);
    }
  });

  it('every fixture has a valid expectedBand [low, high] with low < high', () => {
    for (const f of fixtures) {
      expect(f.expectedBand[0]).toBeLessThan(f.expectedBand[1]);
    }
  });

  it('cv7 band is entirely below 25 (negative control)', () => {
    const cv7 = fixtures.find((f) => f.id === 'sommelier-cv7-negative-control-office-admin');
    expect(cv7?.expectedBand[1]).toBeLessThanOrEqual(25);
  });

  it('cv5 band lower bound is at least 80 (strongest candidate)', () => {
    const cv5 = fixtures.find((f) => f.id === 'sommelier-cv5-sommelier-strongest');
    expect(cv5?.expectedBand[0]).toBeGreaterThanOrEqual(80);
  });
});

// ─── Integration tests — require GROQ_API_KEY ────────────────────────────────

async function scoreOnce(cvText: string, roleSlug: string): Promise<CvScoreResult> {
  const rolesData = cruiseRolesRaw as { roles: Array<{ slug: string; keywords: string[]; [k: string]: unknown }> };
  const role = rolesData.roles.find((r) => r.slug === roleSlug);
  if (!role) throw new Error(`Role not found: ${roleSlug}`);

  const signals = runDeterministicChecks(cvText);
  const { matchedKeywords, missingKeywords, matchRatio } = scoreKeywordAlignment(cvText, role.keywords);

  const { system, user } = buildCvCheckPrompt({
    cvText,
    role: role as Parameters<typeof buildCvCheckPrompt>[0]['role'],
    signals,
    matchedKeywords,
    missingKeywords,
    matchRatio,
  });

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) throw new Error(`Groq error ${response.status}: ${await response.text()}`);
  const json = await response.json() as { choices: Array<{ message: { content: string } }> };
  const content = json.choices[0]?.message?.content ?? '';
  const llm = parseCvCheckResponse(content);
  return computeCvScore(llm, matchedKeywords, missingKeywords);
}

function median(vals: number[]): number {
  const sorted = [...vals].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

describe.skipIf(!GROQ_KEY)('B-1 integration: fixture scoring (3-run median policy)', () => {
  // Store runs for all fixtures across tests
  const runResults: Record<string, number[]> = {};
  const runFeedback: Record<string, string[]> = {};
  let fixtures: CvFixture[];

  beforeAll(async () => {
    fixtures = loadFixtures(FIXTURES_DIR);

    // Run all 5 fixtures × 3 times (sequential to respect rate limits).
    // Free-tier Groq TPM limit (~12k/min) requires ~20s between calls.
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    for (const fixture of fixtures) {
      runResults[fixture.id] = [];
      runFeedback[fixture.id] = [];
    }

    let callCount = 0;
    for (let run = 0; run < 3; run++) {
      for (const fixture of fixtures) {
        if (callCount > 0) await sleep(20_000); // 20s gap → stays under 12k TPM
        const result = await scoreOnce(fixture.cvText, fixture.role);
        callCount++;
        runResults[fixture.id].push(result.overallScore);
        // Collect all feedback text for flag assertions
        const allFeedback = [
          ...Object.values(result.categories).map((c) => c.feedback),
          ...result.topFixes,
        ].join(' ');
        runFeedback[fixture.id].push(allFeedback);
      }
    }
  }, 360_000); // 6 min timeout for 15 API calls with 20s gaps

  // ─── T1: Band assertions ─────────────────────────────────────────────────

  it('T1: cv5 (strongest) median score is in band 83–90', () => {
    const id = 'sommelier-cv5-sommelier-strongest';
    const scores = runResults[id];
    const med = median(scores);
    console.log(`cv5 scores: ${scores.join(', ')} — median: ${med}`);
    expect(med).toBeGreaterThanOrEqual(83);
    expect(med).toBeLessThanOrEqual(90);
    // No single run more than 10 points outside band
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(73);
      expect(s).toBeLessThanOrEqual(100);
    }
  });

  it('T1: cv4 (Cunard land+sea) median score is in band 73–80', () => {
    const id = 'sommelier-cv4-sommelier-winewaiter-cunard';
    const scores = runResults[id];
    const med = median(scores);
    console.log(`cv4 scores: ${scores.join(', ')} — median: ${med}`);
    expect(med).toBeGreaterThanOrEqual(73);
    expect(med).toBeLessThanOrEqual(80);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(63);
      expect(s).toBeLessThanOrEqual(90);
    }
  });

  it('T1: cv3 (wine steward) median score is in band 65–70', () => {
    const id = 'sommelier-cv3-winesteward-weakest';
    const scores = runResults[id];
    const med = median(scores);
    console.log(`cv3 scores: ${scores.join(', ')} — median: ${med}`);
    expect(med).toBeGreaterThanOrEqual(65);
    expect(med).toBeLessThanOrEqual(70);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(55);
      expect(s).toBeLessThanOrEqual(80);
    }
  });

  it('T1: cv6 (entry-level waiter) median score is in band 30–45', () => {
    const id = 'sommelier-cv6-weak-on-topic-entry-level';
    const scores = runResults[id];
    const med = median(scores);
    console.log(`cv6 scores: ${scores.join(', ')} — median: ${med}`);
    expect(med).toBeGreaterThanOrEqual(30);
    expect(med).toBeLessThanOrEqual(45);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(20);
      expect(s).toBeLessThanOrEqual(55);
    }
  });

  it('T1: cv7 (office admin, negative control) median score is in band 5–20', () => {
    const id = 'sommelier-cv7-negative-control-office-admin';
    const scores = runResults[id];
    const med = median(scores);
    console.log(`cv7 scores: ${scores.join(', ')} — median: ${med}`);
    expect(med).toBeGreaterThanOrEqual(5);
    expect(med).toBeLessThanOrEqual(20);
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(30);
    }
  });

  // ─── T2: Strict ranking on ALL 3 runs ────────────────────────────────────

  it('T2: ranking cv5 > cv4 > cv3 > cv6 > cv7 holds on all 3 runs', () => {
    for (let run = 0; run < 3; run++) {
      const scores = RANKED_IDS.map((id) => runResults[id][run]);
      console.log(`Run ${run + 1} ranking: ${RANKED_IDS.map((id, i) => `${id.split('-')[1]}=${scores[i]}`).join(', ')}`);
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThan(scores[i + 1]);
      }
    }
  });

  // ─── T3: Anti-collapse assertions ────────────────────────────────────────

  it('T3: gap(cv6 - cv7) >= 15 on all 3 runs', () => {
    const cv6 = runResults['sommelier-cv6-weak-on-topic-entry-level'];
    const cv7 = runResults['sommelier-cv7-negative-control-office-admin'];
    for (let run = 0; run < 3; run++) {
      const gap = cv6[run] - cv7[run];
      console.log(`Run ${run + 1} gap(cv6-cv7): ${gap}`);
      expect(gap).toBeGreaterThanOrEqual(15);
    }
  });

  it('T3: gap(cv3 - cv6) >= 15 on all 3 runs', () => {
    const cv3 = runResults['sommelier-cv3-winesteward-weakest'];
    const cv6 = runResults['sommelier-cv6-weak-on-topic-entry-level'];
    for (let run = 0; run < 3; run++) {
      const gap = cv3[run] - cv6[run];
      console.log(`Run ${run + 1} gap(cv3-cv6): ${gap}`);
      expect(gap).toBeGreaterThanOrEqual(15);
    }
  });

  // ─── T4: Anti-zero regression ─────────────────────────────────────────────

  it('T4: no CV scores exactly 0 on any run (B-0 regression guard)', () => {
    for (const id of RANKED_IDS) {
      for (const score of runResults[id]) {
        expect(score).toBeGreaterThan(0);
      }
    }
  });

  // ─── T5: Flag assertions ─────────────────────────────────────────────────

  it('T5: cv7 feedback flags off-role field on median run', () => {
    const id = 'sommelier-cv7-negative-control-office-admin';
    // Use run 1 (index 1) as the "median" run for feedback check
    const medianRunIdx = 1;
    const feedback = runFeedback[id][medianRunIdx].toLowerCase();
    const flagTerms = ['different field', 'office', 'admin', 'not hospitality', 'no hospitality', 'no f&b'];
    const matched = flagTerms.some((t) => feedback.includes(t));
    expect(matched).toBe(true);
  });

  it('T5: cv7 feedback does NOT flag "improve formatting" or "add more quantified achievements"', () => {
    const id = 'sommelier-cv7-negative-control-office-admin';
    for (const feedback of runFeedback[id]) {
      const lower = feedback.toLowerCase();
      expect(lower).not.toMatch(/improve (your )?formatting/);
      expect(lower).not.toMatch(/add more quantified/);
    }
  });

  it('T5: cv6 feedback flags no wine specialism or credentials', () => {
    const id = 'sommelier-cv6-weak-on-topic-entry-level';
    const medianRunIdx = 1;
    const feedback = runFeedback[id][medianRunIdx].toLowerCase();
    const flagTerms = ['wset', 'wine specialism', 'wine credential', 'no wine', 'sommelier credential', 'seafarer', 'cruise'];
    const matched = flagTerms.filter((t) => feedback.includes(t));
    expect(matched.length).toBeGreaterThanOrEqual(2);
  });

  it('T5: cv6 feedback does NOT flag "no hospitality experience" or "wrong industry"', () => {
    const id = 'sommelier-cv6-weak-on-topic-entry-level';
    for (const feedback of runFeedback[id]) {
      const lower = feedback.toLowerCase();
      expect(lower).not.toMatch(/no hospitality experience/);
      expect(lower).not.toMatch(/wrong industry/);
      expect(lower).not.toMatch(/irrelevant (to|for) (the )?role/);
    }
  });
}, 300_000);
