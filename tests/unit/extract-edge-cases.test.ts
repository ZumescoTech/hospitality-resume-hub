import { describe, it, expect } from 'vitest';
import { extractTextFromFile } from '@/lib/extractCvText';
import { ExtractionError } from '@/lib/extraction-error';

// These tests exercise the extraction dispatcher with synthetic File objects.
// They verify error messages and guards without requiring real PDF binaries.

function makeFile(content: string, name: string, type: string): File {
  return new File([content], name, { type });
}

describe('extractTextFromFile — edge case guards', () => {
  it('rejects .doc files with reasonCode legacy_doc', async () => {
    const file = makeFile('binary garbage', 'resume.doc', 'application/msword');
    await expect(extractTextFromFile(file)).rejects.toThrow('Legacy .doc files are not supported');
    try {
      await extractTextFromFile(file);
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect((err as ExtractionError).reasonCode).toBe('legacy_doc');
    }
  });

  it('rejects unsupported file types with reasonCode unsupported_mime', async () => {
    const file = makeFile('data', 'image.png', 'image/png');
    await expect(extractTextFromFile(file)).rejects.toThrow('Unsupported file type');
    try {
      await extractTextFromFile(file);
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect((err as ExtractionError).reasonCode).toBe('unsupported_mime');
    }
  });

  it('rejects .txt files with less than 50 chars with reasonCode insufficient_text', async () => {
    const file = makeFile('Too short', 'cv.txt', 'text/plain');
    await expect(extractTextFromFile(file)).rejects.toThrow("couldn't extract enough text");
    try {
      await extractTextFromFile(file);
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect((err as ExtractionError).reasonCode).toBe('insufficient_text');
    }
  });

  it('extracts text from valid .txt files', async () => {
    const content = `John Smith — Head Waiter
john@example.com | +44 7700 900000
Professional Summary: Experienced waiter with 5 years in fine dining.
Served 200+ covers per shift at Michelin-starred restaurants.`;
    const file = makeFile(content, 'cv.txt', 'text/plain');
    const result = await extractTextFromFile(file);
    expect(result).toContain('John Smith');
    expect(result).toContain('200+ covers');
  });

  it('handles .txt files with unicode content', async () => {
    const content = `José María García-López — Maître d'hôtel
josé@example.com | +34 612 345 678
Expérience: 10 ans en hôtellerie de luxe. Spécialisé en service à la française.
Connaissance approfondie des vins du Rhône et de Bourgogne.`;
    const file = makeFile(content, 'cv.txt', 'text/plain');
    const result = await extractTextFromFile(file);
    expect(result).toContain('José María');
    expect(result).toContain('Maître');
  });

  it('handles .txt with only whitespace beyond 50 chars as insufficient', async () => {
    const content = '  '.repeat(100); // 200 spaces
    const file = makeFile(content, 'cv.txt', 'text/plain');
    await expect(extractTextFromFile(file)).rejects.toThrow("couldn't extract enough text");
    try {
      await extractTextFromFile(file);
    } catch (err) {
      expect(err).toBeInstanceOf(ExtractionError);
      expect((err as ExtractionError).reasonCode).toBe('insufficient_text');
      expect((err as ExtractionError).stage).toBe('extracting');
    }
  });
});
