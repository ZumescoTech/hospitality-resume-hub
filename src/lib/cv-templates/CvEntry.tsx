/**
 * CvEntry — shared structural primitive for experience / education items.
 *
 * Accepts description as `string | string[] | undefined`:
 *   - string[]   — freshly-parsed CV data (no embedded markers)
 *   - string     — legacy builder-typed or old localStorage blob (may contain
 *                  embedded "* " / "- " / "• " markers)
 *
 * normalizeBullets() converts both shapes to a clean string[] at the render
 * boundary — no data migration required for existing saved CVs.
 *
 * Bullet glyph is a render concern, set via tokens.bulletStyle ('dot' | 'dash').
 * No template ever embeds "*", "-", or "•" directly in bullet text.
 */

import { TS } from "./type-scale";
import { normalizeBullets } from "./normalizeBullets";

export interface CvEntryTokens {
  /** Colour for the title line. */
  titleColor: string;
  /** Colour for the meta line (dates, venue). */
  metaColor: string;
  /** Colour for description body text. */
  bodyColor: string;
  /** Italic meta line? Defaults to false. */
  metaItalic?: boolean;
  /** Show dates on the right (flex justify-between)? Defaults to false. */
  datesRight?: boolean;
  /**
   * Bullet marker style. Defaults to 'dot' (•).
   * Templates that want a dash aesthetic set 'dash' (–).
   */
  bulletStyle?: 'dot' | 'dash';
}

interface CvEntryProps {
  title: React.ReactNode;
  /** Primary meta text (e.g. venue + location). */
  meta?: string;
  /** Secondary meta text (dates). Right-aligned when datesRight=true. */
  dates?: string;
  /**
   * Description content. Accepts either:
   * - string[]  — clean bullets from the parser (preferred)
   * - string    — legacy blob, possibly with embedded markers (normalised here)
   */
  description?: string | string[];
  tokens: CvEntryTokens;
  className?: string;
}

export function CvEntry({ title, meta, dates, description, tokens, className }: CvEntryProps) {
  const bullets = normalizeBullets(description);
  const glyph = tokens.bulletStyle === 'dash' ? '–' : '•';

  return (
    <div className={className}>
      {/* Title + optional right-aligned dates */}
      {tokens.datesRight ? (
        <div className="flex items-baseline justify-between gap-3">
          <p className={TS.entryTitle.tw} style={{ color: tokens.titleColor }}>
            {title}
          </p>
          {dates && (
            <p className={`${TS.entryMeta.tw} shrink-0`} style={{ color: tokens.metaColor }}>
              {dates}
            </p>
          )}
        </div>
      ) : (
        <p className={TS.entryTitle.tw} style={{ color: tokens.titleColor }}>
          {title}
        </p>
      )}

      {/* Venue / location / inline-dates meta line */}
      {meta && (
        <p
          className={TS.entryMeta.tw}
          style={{
            color: tokens.metaColor,
            fontStyle: tokens.metaItalic ? "italic" : undefined,
            marginTop: "2px",
          }}
        >
          {meta}
          {!tokens.datesRight && dates ? ` · ${dates}` : ""}
        </p>
      )}

      {/* Bullets — always rendered as <ul>/<li>, never as raw text with markers.
          Single-item lists render as one bullet (not a paragraph). */}
      {bullets.length > 0 && (
        <ul style={{ margin: "4px 0 0", padding: 0, listStyle: "none" }}>
          {bullets.map((b, i) => (
            <li
              key={i}
              className={TS.body.tw}
              style={{
                color: tokens.bodyColor,
                display: "flex",
                gap: 6,
                marginBottom: 2,
              }}
            >
              <span style={{ flexShrink: 0, userSelect: "none" }} aria-hidden="true">
                {glyph}
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
