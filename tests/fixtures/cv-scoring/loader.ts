/**
 * Fixture loader for cv-scoring integration tests.
 * Parses the YAML front-matter subset used in our fixture markdown files.
 * Handles: scalars, inline arrays [a, b], block sequences (- item), folded blocks (>).
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

export interface CvFixture {
  id: string;
  role: string;
  expectedBand: [number, number];
  expectedRankWithinRole: number;
  shouldFlag: string[];
  shouldNotFlag: string[];
  notes: string;
  cvText: string;
}

export function loadFixtures(dir: string): CvFixture[] {
  const files = readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  return files.map((f) => parseFixture(join(dir, f)));
}

export function loadFixtureById(dir: string, id: string): CvFixture {
  const all = loadFixtures(dir);
  const found = all.find((f) => f.id === id);
  if (!found) throw new Error(`Fixture not found: ${id}`);
  return found;
}

function parseFixture(filePath: string): CvFixture {
  const raw = readFileSync(filePath, 'utf-8');

  // Split on the --- delimiters
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid fixture format in: ${filePath}`);

  const yamlBlock = match[1];
  const body = match[2].trim();

  const yaml = parseYamlSubset(yamlBlock);

  return {
    id: String(yaml.id ?? ''),
    role: String(yaml.role ?? ''),
    expectedBand: parseInlineArray(yaml.expectedBand) as [number, number],
    expectedRankWithinRole: Number(yaml.expectedRankWithinRole ?? 0),
    shouldFlag: parseStringList(yaml.shouldFlag),
    shouldNotFlag: parseStringList(yaml.shouldNotFlag),
    notes: String(yaml.notes ?? '').trim(),
    cvText: body,
  };
}

// ─── Minimal YAML subset parser ───────────────────────────────────────────────

type YamlValue = string | number | boolean | string[] | YamlValue[];

function parseYamlSubset(yaml: string): Record<string, YamlValue> {
  const result: Record<string, YamlValue> = {};
  const lines = yaml.split(/\r?\n/);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (!line.trim()) { i++; continue; }

    // Key: value on same line
    const scalarMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (scalarMatch) {
      const key = scalarMatch[1];
      const rawVal = scalarMatch[2].trim();

      if (rawVal === '>') {
        // Folded block scalar — collect indented lines
        i++;
        const parts: string[] = [];
        while (i < lines.length && (lines[i].startsWith('  ') || lines[i] === '')) {
          parts.push(lines[i].replace(/^  /, ''));
          i++;
        }
        result[key] = parts.join(' ').trim();
        continue;
      }

      if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
        // Inline array [a, b]
        result[key] = rawVal
          .slice(1, -1)
          .split(',')
          .map((v) => {
            const n = Number(v.trim());
            return isNaN(n) ? v.trim().replace(/^["']|["']$/g, '') : n;
          });
        i++;
        continue;
      }

      // Plain scalar
      const num = Number(rawVal);
      result[key] = isNaN(num) ? rawVal.replace(/^["']|["']$/g, '') : num;
      i++;
      continue;
    }

    // Key: (block sequence follows)
    const blockKeyMatch = line.match(/^(\w[\w-]*)\s*:\s*$/);
    if (blockKeyMatch) {
      const key = blockKeyMatch[1];
      i++;
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\s+-\s+/)) {
        const item = lines[i].replace(/^\s+-\s+/, '').replace(/^["']|["']$/g, '');
        items.push(item);
        i++;
      }
      result[key] = items;
      continue;
    }

    i++;
  }

  return result;
}

function parseInlineArray(val: YamlValue | undefined): number[] {
  if (Array.isArray(val)) return (val as YamlValue[]).map(Number);
  return [0, 100];
}

function parseStringList(val: YamlValue | undefined): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === 'string' && val) return [val];
  return [];
}
