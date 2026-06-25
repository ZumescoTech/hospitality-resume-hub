// cv-import-handoff.ts
// One-time sessionStorage handoff from the CV checker to the builder.
// Data is consumed on first read and expires after 30 minutes.

import type { ResumeData } from '@/types/resume';

const KEY = 'zumesco:cv-import';
const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface HandoffPayload {
  data: ResumeData;
  savedAt: number;
  roleSlug?: string;
}

export interface CvImportResult {
  data: ResumeData;
  roleSlug?: string;
}

export function saveCvImport(data: ResumeData, roleSlug?: string): void {
  const payload: HandoffPayload = { data, savedAt: Date.now(), roleSlug };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // sessionStorage unavailable (private browsing quota exceeded etc.) — fail silently
  }
}

export function consumeCvImport(): CvImportResult | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;

    // Always remove immediately — one-time read
    sessionStorage.removeItem(KEY);

    const payload = JSON.parse(raw) as HandoffPayload;
    if (Date.now() - payload.savedAt > TTL_MS) return null;

    return { data: payload.data, roleSlug: payload.roleSlug };
  } catch {
    return null;
  }
}

export function clearCvImport(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* ignore */ }
}
