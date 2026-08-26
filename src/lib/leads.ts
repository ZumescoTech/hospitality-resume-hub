export const ACTIVE_LEAD_STORAGE_KEY = 'gethired:active-lead-id';

export const JOURNEY_STAGES = ['captured', 'builder_opened', 'cv_edited', 'exported'] as const;
export type JourneyStage = (typeof JOURNEY_STAGES)[number];

export interface LeadCaptureInput {
  whatsapp_number: string;
  country_code: string;
  roleSlug: string;
  roleLabel?: string;
  overallScore: number;
  tier: string;
  topFixes: string[];
  opted_in: boolean;
  full_name?: string;
  email_from_cv?: string;
}

export interface LeadRow {
  phone: string;
  country_code: string;
  full_name: string | null;
  email_from_cv: string | null;
  consent: boolean;
  consented_at: string | null;
  role_slug: string;
  role_label: string;
  score: number;
  score_tier: string;
  top_fixes: string[];
  journey_stage: JourneyStage;
  source: 'checker';
  wa_me_url: string;
  last_seen_at: string;
  updated_at: string;
}

const STAGE_RANK: Record<JourneyStage, number> = {
  captured: 0,
  builder_opened: 1,
  cv_edited: 2,
  exported: 3,
};

/** E.164-ish digits only, no plus — required by wa.me. */
export function phoneDigits(e164: string): string {
  return e164.replace(/\D/g, '');
}

export function buildWaMeUrl(e164: string, prefilledText?: string): string {
  const digits = phoneDigits(e164);
  const base = `https://wa.me/${digits}`;
  if (!prefilledText?.trim()) return base;
  return `${base}?text=${encodeURIComponent(prefilledText.trim())}`;
}

export function buildStaffWhatsAppMessage(input: {
  fullName?: string | null;
  roleLabel?: string;
  score?: number;
}): string {
  const name = input.fullName?.trim() || 'there';
  const role = input.roleLabel?.trim() || 'your cruise role';
  const score = typeof input.score === 'number' ? ` Your checker score was ${Math.round(input.score)}.` : '';
  return `Hi ${name}, it's GetHired. You checked a CV for ${role}.${score} Reply here if you want openings that match.`;
}

export function buildLeadRow(input: LeadCaptureInput, now = new Date()): LeadRow {
  const iso = now.toISOString();
  const fullName = input.full_name?.trim() || null;
  const email = input.email_from_cv?.trim() || null;
  return {
    phone: input.whatsapp_number,
    country_code: input.country_code.toUpperCase(),
    full_name: fullName,
    email_from_cv: email,
    consent: input.opted_in,
    consented_at: input.opted_in ? iso : null,
    role_slug: input.roleSlug,
    role_label: input.roleLabel?.trim() || input.roleSlug,
    score: input.overallScore,
    score_tier: input.tier,
    top_fixes: input.topFixes.slice(0, 8),
    journey_stage: 'captured',
    source: 'checker',
    wa_me_url: buildWaMeUrl(input.whatsapp_number, buildStaffWhatsAppMessage({
      fullName,
      roleLabel: input.roleLabel || input.roleSlug,
      score: input.overallScore,
    })),
    last_seen_at: iso,
    updated_at: iso,
  };
}

export function advanceJourneyStage(current: JourneyStage | null | undefined, next: JourneyStage): JourneyStage {
  if (!current) return next;
  return STAGE_RANK[next] >= STAGE_RANK[current] ? next : current;
}

export function journeyTimestampColumn(stage: JourneyStage): 'builder_opened_at' | 'cv_edited_at' | 'exported_at' | null {
  if (stage === 'builder_opened') return 'builder_opened_at';
  if (stage === 'cv_edited') return 'cv_edited_at';
  if (stage === 'exported') return 'exported_at';
  return null;
}

export function buildLeadNotifyEmail(row: LeadRow, leadId: string): { subject: string; text: string } {
  const name = row.full_name || 'Name not found on CV';
  const fixes = row.top_fixes.length > 0 ? row.top_fixes.slice(0, 3).join(' · ') : 'none listed';
  return {
    subject: `GetHired lead: ${name} · ${row.role_label} · ${Math.round(row.score)}`,
    text: [
      'New GetHired checker lead',
      `Lead ID: ${leadId}`,
      `Name (from CV): ${name}`,
      `WhatsApp: ${row.phone}`,
      `Open chat: ${row.wa_me_url}`,
      `Role: ${row.role_label}`,
      `Score: ${Math.round(row.score)} (${row.score_tier})`,
      `Consent: ${row.consent ? 'yes' : 'no'}`,
      `Top fixes: ${fixes}`,
    ].join('\n'),
  };
}

export function persistActiveLeadId(leadId: string): void {
  try {
    localStorage.setItem(ACTIVE_LEAD_STORAGE_KEY, leadId);
  } catch {
    /* private mode / quota */
  }
}

export function readActiveLeadId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_LEAD_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function clearActiveLeadId(): void {
  try {
    localStorage.removeItem(ACTIVE_LEAD_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
