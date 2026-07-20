import { describe, it, expect } from 'vitest';
import { sanitizeJobDescription } from '@/lib/cvDeterministicChecks';

describe('sanitizeJobDescription', () => {
  it('returns null for empty/undefined input', () => {
    expect(sanitizeJobDescription(undefined)).toBeNull();
    expect(sanitizeJobDescription('')).toBeNull();
    expect(sanitizeJobDescription('   ')).toBeNull();
  });

  it('returns null for text shorter than 30 chars', () => {
    expect(sanitizeJobDescription('Short text here')).toBeNull();
    expect(sanitizeJobDescription('Less than thirty characters')).toBeNull();
  });

  it('returns sanitized text for valid job descriptions', () => {
    const jd = 'We are looking for an experienced sommelier to join our luxury cruise team. Must have WSET Level 3 and 3+ years fine dining experience.';
    const result = sanitizeJobDescription(jd);
    expect(result).not.toBeNull();
    expect(result).toContain('sommelier');
    expect(result).toContain('WSET Level 3');
  });

  it('strips HTML tags from pasted web content', () => {
    const htmlJd = '<div class="job-desc"><p>Looking for a <strong>bartender</strong> with cocktail experience.</p><ul><li>5 years experience</li></ul></div>';
    const result = sanitizeJobDescription(htmlJd);
    expect(result).not.toBeNull();
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
    expect(result).toContain('bartender');
    expect(result).toContain('cocktail experience');
  });

  it('rejects JavaScript/code garbage', () => {
    const codeGarbage = 'function() { const x = import { something } from "module"; return <Component />; }';
    expect(sanitizeJobDescription(codeGarbage)).toBeNull();
  });

  it('rejects HTML-heavy content that looks like page source', () => {
    const htmlSource = '<html><head><title>Job</title></head><body><div class="wrapper"><nav>Menu items</nav></div></body></html>';
    expect(sanitizeJobDescription(htmlSource)).toBeNull();
  });

  it('caps extremely long job descriptions at 5000 chars', () => {
    const longJd = 'This is a valid job description for a sommelier role. '.repeat(200); // ~11000 chars
    const result = sanitizeJobDescription(longJd);
    expect(result).not.toBeNull();
    expect(result!.length).toBeLessThanOrEqual(5000);
  });

  it('handles non-English job descriptions gracefully', () => {
    const frenchJd = 'Nous recherchons un sommelier expérimenté pour notre restaurant étoilé. Connaissance des vins français et italiens requise. Minimum 5 ans d\'expérience.';
    const result = sanitizeJobDescription(frenchJd);
    expect(result).not.toBeNull();
    expect(result).toContain('sommelier');
  });

  it('collapses excessive whitespace', () => {
    const messyJd = 'Looking   for   a    waiter\n\n\n\nwith   experience\t\tin  fine dining and cruise ship service requirements';
    const result = sanitizeJobDescription(messyJd);
    expect(result).not.toBeNull();
    expect(result).not.toContain('  '); // no double spaces
  });
});
