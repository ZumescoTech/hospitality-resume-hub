/**
 * Phase 1 — parseCvLocally must return a useful structured resume, not a
 * contact-only skeleton. Fixtures are fictional hospitality CVs.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseCvLocally } from '@/lib/cvExtractDeterministic';

const DIR = resolve(__dirname, '../fixtures/cvs');
const load = (file: string) => readFileSync(resolve(DIR, file), 'utf8');

function certNames(parsed: ReturnType<typeof parseCvLocally>): string {
  return parsed.certifications.map((c) => c.name).join(' | ');
}

describe('parseCvLocally — waiter-experienced.txt', () => {
  const parsed = parseCvLocally(load('waiter-experienced.txt'));

  it('extracts contact details', () => {
    expect(parsed.personal.fullName).toMatch(/james holloway/i);
    expect(parsed.personal.email).toBe('james.holloway@email.com');
    expect(parsed.personal.phone).toMatch(/7700/);
    expect(parsed.personal.links?.some((l) => /linkedin/i.test(l.url))).toBe(true);
  });

  it('preserves the professional summary', () => {
    expect(parsed.summary).toMatch(/fine-dining waiter/i);
    expect(parsed.summary).toMatch(/8 years/i);
  });

  it('parses multiple experience entries', () => {
    expect(parsed.experience.length).toBeGreaterThanOrEqual(3);
    const roles = parsed.experience.map((e) => e.role).join(' | ');
    expect(roles).toMatch(/Senior Waiter/i);
    expect(roles).toMatch(/Commis Waiter/i);
    expect(parsed.experience.some((e) => /MSC Cruises/i.test(e.venue))).toBe(true);
    expect(parsed.experience.some((e) => /Dorchester/i.test(e.venue))).toBe(true);
  });

  it('keeps achievement bullets on the correct position', () => {
    const senior = parsed.experience.find((e) => /Senior Waiter/i.test(e.role));
    expect(senior).toBeDefined();
    const bullets = senior!.bullets ?? [];
    expect(bullets.length).toBeGreaterThanOrEqual(2);
    expect(bullets.some((b) => /250/.test(b))).toBe(true);
    expect(bullets.some((b) => /NPS/i.test(b))).toBe(true);
    expect(bullets.some((b) => /Claridge/i.test(b))).toBe(false);
  });

  it('preserves education', () => {
    expect(parsed.education.length).toBeGreaterThanOrEqual(1);
    const blob = JSON.stringify(parsed.education);
    expect(blob).toMatch(/Westminster/i);
    expect(blob).toMatch(/Hospitality/i);
  });

  it('preserves skills without unwanted duplicates', () => {
    expect(parsed.skills.length).toBeGreaterThanOrEqual(4);
    expect(parsed.skills.some((s) => /silver service/i.test(s))).toBe(true);
    expect(parsed.skills.some((s) => /micros/i.test(s))).toBe(true);
    const lower = parsed.skills.map((s) => s.trim().toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });

  it('adds STCW, WSET and HACCP as separate certifications', () => {
    const names = certNames(parsed);
    expect(names).toMatch(/STCW/i);
    expect(names).toMatch(/WSET/i);
    expect(names).toMatch(/HACCP/i);
    expect(parsed.certifications.length).toBeGreaterThanOrEqual(3);
  });
});

describe('parseCvLocally — sommelier-junior.txt', () => {
  const parsed = parseCvLocally(load('sommelier-junior.txt'));

  it('extracts contact and summary', () => {
    expect(parsed.personal.fullName).toMatch(/amelia fontaine/i);
    expect(parsed.personal.email).toMatch(/amelia\.fontaine@email\.com/i);
    expect(parsed.summary).toMatch(/junior sommelier/i);
    expect(parsed.summary).toMatch(/WSET/i);
  });

  it('parses multiple wine-service roles with attached bullets', () => {
    expect(parsed.experience.length).toBeGreaterThanOrEqual(3);
    const junior = parsed.experience.find((e) => /Junior Sommelier/i.test(e.role));
    expect(junior?.venue).toMatch(/Terrasse/i);
    expect(junior?.bullets?.some((b) => /400-bottle/i.test(b) || /400-bottle/i.test(b))).toBe(true);
  });

  it('keeps WSET and HACCP as separate certifications', () => {
    const names = certNames(parsed);
    expect(names).toMatch(/WSET/i);
    expect(names).toMatch(/HACCP/i);
    expect(parsed.certifications.filter((c) => /WSET/i.test(c.name)).length).toBe(1);
  });
});

describe('parseCvLocally — housekeeping-supervisor.txt / cabin-steward-thin.txt', () => {
  it('parses the housekeeping supervisor CV', () => {
    const parsed = parseCvLocally(load('housekeeping-supervisor.txt'));
    expect(parsed.personal.fullName).toMatch(/maria vasquez/i);
    expect(parsed.summary).toMatch(/housekeeping supervisor/i);
    expect(parsed.experience.length).toBeGreaterThanOrEqual(3);
    expect(parsed.experience.some((e) => /Gran Hotel Havana/i.test(e.venue))).toBe(true);
    expect(certNames(parsed)).toMatch(/HACCP/i);
    expect(parsed.skills.some((s) => /Opera PMS/i.test(s))).toBe(true);
  });

  it('parses the thin cabin-style CV without inventing shipboard certs', () => {
    const parsed = parseCvLocally(load('cabin-steward-thin.txt'));
    expect(parsed.personal.fullName).toMatch(/john smith/i);
    expect(parsed.personal.email).toMatch(/johnsmith@email\.com/i);
    expect(parsed.experience.length).toBeGreaterThanOrEqual(2);
    expect(parsed.experience.some((e) => /QuickMart/i.test(e.venue))).toBe(true);
    expect(certNames(parsed)).not.toMatch(/STCW/i);
    expect(certNames(parsed)).not.toMatch(/ENG1/i);
    expect(certNames(parsed)).not.toMatch(/WSET/i);
  });
});

describe('parseCvLocally — galley-steward.txt (ENG1 + STCW + HACCP)', () => {
  const parsed = parseCvLocally(load('galley-steward.txt'));

  it('extracts contact, summary, jobs and education', () => {
    expect(parsed.personal.fullName).toMatch(/lebohang mokoena/i);
    expect(parsed.personal.email).toBe('lebohang.mokoena@email.com');
    expect(parsed.personal.location).toMatch(/Cape Town/i);
    expect(parsed.summary).toMatch(/galley steward/i);
    expect(parsed.experience.length).toBeGreaterThanOrEqual(2);
    expect(parsed.education.some((e) => /Food Preparation/i.test(e.degree) || /Food Preparation/i.test(e.school))).toBe(true);
  });

  it('writes STCW, WSET-absent, HACCP and ENG1 as distinct certs', () => {
    const names = certNames(parsed);
    expect(names).toMatch(/STCW/i);
    expect(names).toMatch(/HACCP/i);
    expect(names).toMatch(/ENG1/i);
    expect(names).not.toMatch(/WSET/i);
    expect(parsed.certifications.length).toBeGreaterThanOrEqual(3);
  });
});

describe('parseCvLocally — sparse and malformed input', () => {
  it('returns safe empty sections for weak-generic.txt and does not invent certs or employers', () => {
    const parsed = parseCvLocally(load('weak-generic.txt'));
    expect(parsed.personal.fullName).toMatch(/tapiwa nleya/i);
    expect(parsed.personal.email).toMatch(/tapiwa\.nleya@example\.com/i);
    expect(certNames(parsed)).not.toMatch(/STCW|WSET|HACCP|ENG1/i);
    const blob = JSON.stringify(parsed.experience);
    expect(blob).not.toMatch(/Royal Caribbean|MSC Cruises|Cunard/i);
  });

  it('does not crash on empty, tiny, or garbled text', () => {
    expect(() => parseCvLocally('')).not.toThrow();
    expect(() => parseCvLocally('Hi')).not.toThrow();
    expect(() => parseCvLocally('\x00\x01\x02 garbage '.repeat(20))).not.toThrow();
    const empty = parseCvLocally('');
    expect(empty.experience).toEqual([]);
    expect(empty.education).toEqual([]);
    expect(empty.skills).toEqual([]);
    expect(empty.certifications).toEqual([]);
    expect(empty.summary).toBe('');
  });

  it('does not invent employment when no jobs are present', () => {
    const parsed = parseCvLocally(
      'NOZIPHO RADEBE\nnozipho.radebe@email.com\n+27 71 000 0000\n\nSKILLS\nEnglish\n',
    );
    expect(parsed.experience).toEqual([]);
    expect(parsed.certifications).toEqual([]);
  });
});

describe('parseCvLocally — hospitality profile from present evidence only', () => {
  it('maps waiter POS, wine service, languages and food safety', () => {
    const parsed = parseCvLocally(load('waiter-experienced.txt'));
    expect(parsed.hospitality.posSystems.some((s) => /micros/i.test(s))).toBe(true);
    expect(parsed.hospitality.wineKnowledge).not.toBe('None');
    expect(parsed.hospitality.serviceStyles.some((s) => /fine dining|silver service/i.test(s))).toBe(true);
    expect(parsed.hospitality.languages.some((l) => /english/i.test(l.name) && l.level === 'Native')).toBe(true);
    expect(parsed.hospitality.foodSafety).toMatch(/HACCP/i);
  });

  it('maps sommelier wine knowledge, Eazywine, and stated languages', () => {
    const parsed = parseCvLocally(load('sommelier-junior.txt'));
    expect(parsed.hospitality.wineKnowledge).toBe('Sommelier');
    expect(parsed.hospitality.posSystems.some((s) => /eazywine/i.test(s))).toBe(true);
    const langs = parsed.hospitality.languages.map((l) => `${l.name}:${l.level}`).join('|');
    expect(langs).toMatch(/French:Native/i);
    expect(langs).toMatch(/English:Fluent/i);
    expect(langs).toMatch(/Italian:Basic/i);
  });

  it('maps bartender cocktail/spirits knowledge without inventing Micros', () => {
    const parsed = parseCvLocally(load('bartender-mid.txt'));
    expect(parsed.hospitality.spiritsKnowledge).not.toBe('None');
    expect(parsed.hospitality.wineKnowledge).not.toBe('None');
    expect(parsed.hospitality.posSystems.join(' ')).not.toMatch(/Micros/i);
  });

  it('does not invent POS, wine or certs on a thin cabin CV', () => {
    const parsed = parseCvLocally(load('cabin-steward-thin.txt'));
    expect(parsed.hospitality.posSystems).toEqual([]);
    expect(parsed.hospitality.wineKnowledge).toBe('None');
    expect(parsed.hospitality.spiritsKnowledge).toBe('None');
    expect(parsed.hospitality.serviceStyles).toEqual([]);
  });
});
