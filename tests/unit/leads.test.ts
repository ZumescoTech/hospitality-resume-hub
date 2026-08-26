import { describe, expect, it } from 'vitest';
import {
  advanceJourneyStage,
  buildLeadNotifyEmail,
  buildLeadRow,
  buildWaMeUrl,
  phoneDigits,
} from '@/lib/leads';

describe('lead helpers', () => {
  it('strips formatting for wa.me digits', () => {
    expect(phoneDigits('+27 73 123 4567')).toBe('27731234567');
  });

  it('builds a staff click-to-chat URL with prefilled text', () => {
    const url = buildWaMeUrl('+27731234567', 'Hi Sipho');
    expect(url.startsWith('https://wa.me/27731234567?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Hi Sipho'));
  });

  it('stores name from the CV payload and never invents one', () => {
    const withName = buildLeadRow({
      whatsapp_number: '+27731234567',
      country_code: 'za',
      roleSlug: 'sommelier',
      roleLabel: 'Sommelier',
      overallScore: 72,
      tier: 'Good',
      topFixes: ['Add STCW'],
      opted_in: true,
      full_name: 'Sipho Dlamini',
    });
    expect(withName.full_name).toBe('Sipho Dlamini');
    expect(withName.consent).toBe(true);
    expect(withName.country_code).toBe('ZA');
    expect(withName.wa_me_url).toContain('wa.me/27731234567');

    const noName = buildLeadRow({
      whatsapp_number: '+27731234567',
      country_code: 'ZA',
      roleSlug: 'sommelier',
      overallScore: 40,
      tier: 'Needs Work',
      topFixes: [],
      opted_in: true,
    });
    expect(noName.full_name).toBeNull();
  });

  it('never downgrades journey stage', () => {
    expect(advanceJourneyStage('exported', 'captured')).toBe('exported');
    expect(advanceJourneyStage('captured', 'builder_opened')).toBe('builder_opened');
    expect(advanceJourneyStage(null, 'cv_edited')).toBe('cv_edited');
  });

  it('writes a short email with name, phone, score and wa.me', () => {
    const row = buildLeadRow({
      whatsapp_number: '+27731234567',
      country_code: 'ZA',
      roleSlug: 'cabin-steward',
      roleLabel: 'Cabin Steward',
      overallScore: 61,
      tier: 'Good',
      topFixes: ['Quantify guest numbers', 'Add ENG1'],
      opted_in: true,
      full_name: 'Thandi Nkosi',
    });
    const email = buildLeadNotifyEmail(row, 'lead-123');
    expect(email.subject).toContain('Thandi Nkosi');
    expect(email.text).toContain('+27731234567');
    expect(email.text).toContain('https://wa.me/27731234567');
    expect(email.text).toContain('Cabin Steward');
  });
});
