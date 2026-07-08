/**
 * Microsoft Clarity — thin wrapper
 *
 * All calls are gated on VITE_CLARITY_PROJECT_ID being present so local dev
 * without a key never errors. Import and call these helpers; never call the
 * Clarity SDK directly from feature code.
 *
 * Privacy note: input masking must be enabled at the Clarity project level
 * (Dashboard → Settings → Masking → Balanced or Strict). This is not
 * configurable via the npm API — it is a server-side project setting.
 * Do NOT pass CV content, file names, or personal identifiers as event data.
 */

import Clarity from '@microsoft/clarity';

const PROJECT_ID = import.meta.env.VITE_CLARITY_PROJECT_ID as string | undefined;

export function initClarity(): void {
  if (!PROJECT_ID) return;
  Clarity.init(PROJECT_ID);
}

/**
 * Fire a named funnel event. Event names must be one of the defined
 * ClarityEvent strings — no free-form strings outside this module.
 */
export type ClarityEvent =
  | 'cv_upload_started'
  | 'cv_upload_succeeded'
  | 'cv_upload_failed'
  | 'score_viewed'
  | 'builder_entered'
  | 'export_triggered'
  | 'export_succeeded'
  | 'export_failed';

export function trackEvent(name: ClarityEvent): void {
  if (!PROJECT_ID) return;
  try {
    Clarity.event(name);
  } catch {
    // Clarity blocked by ad-blocker or not yet loaded — fail silently
  }
}
