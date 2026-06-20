/**
 * normalizeBullets — render-boundary normalizer for experience/education descriptions.
 *
 * Handles three input shapes:
 *  1. string[]   — already clean (freshly-parsed CV). Filters empty items.
 *  2. string     — legacy localStorage blob, possibly with embedded markers.
 *                  Splits on newlines, strips leading •/-/*·, trims each item.
 *  3. undefined  — returns [].
 *
 * Called inside CvEntry so no template needs to know about the dual format,
 * and no data migration is needed for existing saved CVs.
 */
export function normalizeBullets(input: string | string[] | undefined): string[] {
  if (!input) return [];

  if (Array.isArray(input)) {
    return input.map((s) => s.trim()).filter(Boolean);
  }

  // Single string — split on newlines and strip marker characters
  const lines = input
    .split('\n')
    .map((l) => l.replace(/^[\u2022\-\*\·]\s*/, '').trim())
    .filter(Boolean);

  // If after splitting we still have only one non-empty item, return it as a
  // single-element array (so it renders as one bullet, not a paragraph).
  return lines;
}
