/**
 * CV validation gate — non-CVs must never be scored; genuine and sparse
 * entry-level CVs must pass. All fixtures are synthetic.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { classifyCvDocument } from '@/lib/cvDocumentClassifier';

const FIXTURES = resolve(__dirname, '../fixtures');

function readDir(dir: string, ext: string): [string, string][] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(ext))
    .map((f) => [f, readFileSync(join(dir, f), 'utf8')]);
}

const stripFrontmatter = (md: string) => md.replace(/^---[\s\S]*?\n---\n/, '');

const CVS: [string, string][] = [
  ...readDir(join(FIXTURES, 'cvs'), '.txt'),
  ...readDir(join(FIXTURES, 'documents/cv'), '.txt'),
  ...readDir(join(FIXTURES, 'cv-scoring'), '.md').map(([f, t]): [string, string] => [f, stripFrontmatter(t)]),
];
const NON_CVS = readDir(join(FIXTURES, 'documents/non-cv'), '.txt');

describe('classifyCvDocument — genuine CVs', () => {
  it('has a meaningful positive set', () => {
    expect(CVS.length).toBeGreaterThanOrEqual(20);
  });

  it.each(CVS)('%s is a valid CV', (_name, text) => {
    expect(classifyCvDocument(text).verdict).toBe('valid_cv');
  });
});

describe('classifyCvDocument — unrelated documents', () => {
  it.each(NON_CVS)('%s is never classified as a valid CV', (_name, text) => {
    expect(classifyCvDocument(text).verdict).not.toBe('valid_cv');
  });

  it.each([
    ['cover-letter.txt', 'cover_letter'],
    ['invoice.txt', 'invoice'],
    ['bank-statement.txt', 'bank_statement'],
    ['certificate.txt', 'certificate'],
    ['assignment.txt', 'assignment'],
  ])('%s is rejected as %s with a specific reason', (file, kind) => {
    const text = readFileSync(join(FIXTURES, 'documents/non-cv', file), 'utf8');
    const result = classifyCvDocument(text);
    expect(result.verdict).toBe('not_a_cv');
    expect(result.detectedKind).toBe(kind);
    expect(result.reason.length).toBeGreaterThan(10);
  });

  it('rejects unstructured prose with no CV evidence', () => {
    const text = readFileSync(join(FIXTURES, 'documents/non-cv/recipe.txt'), 'utf8');
    expect(classifyCvDocument(text).verdict).toBe('not_a_cv');
  });
});

describe('classifyCvDocument — uncertain inputs', () => {
  it('asks rather than scores when CV evidence is thin', () => {
    const text = 'Sam Example\nsam@example.com\nI like working with people and want a job on a ship one day.';
    expect(classifyCvDocument(text).verdict).toBe('uncertain');
  });

  it('asks rather than rejects when a full CV arrives with a cover letter attached', () => {
    const cv = readFileSync(join(FIXTURES, 'cvs/waiter-experienced.txt'), 'utf8');
    const letter = readFileSync(join(FIXTURES, 'documents/non-cv/cover-letter.txt'), 'utf8');
    const result = classifyCvDocument(`${letter}\n\n${cv}`);
    expect(result.verdict).toBe('uncertain');
    expect(result.detectedKind).toBe('cover_letter');
  });

  it('does not treat the word "CV" or "resume" alone as evidence', () => {
    const text = 'CURRICULUM VITAE\nResume\nThis document is a placeholder with no further information in it at all.';
    expect(classifyCvDocument(text).verdict).toBe('not_a_cv');
  });
});

describe('classifyCvDocument — determinism', () => {
  it('returns identical output for identical input', () => {
    const [, text] = CVS[0];
    expect(classifyCvDocument(text)).toEqual(classifyCvDocument(text));
  });
});
