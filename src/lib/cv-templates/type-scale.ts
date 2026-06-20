/**
 * Shared type scale for all CV templates.
 *
 * All sizes are rem values. Templates set a base font size on their root element
 * (typically 0.6875rem / 11px) — all other sizes are expressed relative to that
 * via these constants so the proportional relationships are consistent everywhere.
 *
 * Templates MAY override `name` size because it is a core visual-identity choice
 * (e.g. Tokyo's dramatic 5xl vs Brasserie's compact 2xl). All other roles MUST
 * use these values without deviation.
 *
 * Usage in Tailwind templates:
 *   <h1 className={TS.name.tw}>...</h1>
 *   <p className={TS.body.tw}>...</p>
 *
 * Usage in inline-style templates (EditorialSidebar, Elegant):
 *   style={{ fontSize: TS.sectionHeader.rem, lineHeight: TS.sectionHeader.lh }}
 */

export const TS = {
  /**
   * Candidate name. Templates may substitute their own Tailwind name-size class
   * for visual identity reasons — use `TS.name` as the default.
   */
  name: {
    rem: "1.75rem",   // ~28px
    lh: 1.2,
    tw: "text-[1.75rem] leading-tight font-bold",
  },

  /** Job title / role subtitle immediately below the name. */
  jobTitle: {
    rem: "0.75rem",   // ~12px
    lh: 1.3,
    tw: "text-[0.75rem] leading-snug",
  },

  /**
   * Section headings (EXPERIENCE, EDUCATION, SKILLS, …).
   * Intentionally smaller than body — these are labels, not content.
   */
  sectionHeader: {
    rem: "0.625rem",  // ~10px
    lh: 1.2,
    tw: "text-[0.625rem] leading-none font-bold uppercase tracking-[0.28em]",
  },

  /** Entry title: role name, degree name, certification name. */
  entryTitle: {
    rem: "0.75rem",   // ~12px
    lh: 1.3,
    tw: "text-[0.75rem] leading-snug font-semibold",
  },

  /** Entry meta: dates, venue, location — subdued secondary text. */
  entryMeta: {
    rem: "0.625rem",  // ~10px
    lh: 1.3,
    tw: "text-[0.625rem] leading-snug",
  },

  /** Body / description paragraphs and bullet text. */
  body: {
    rem: "0.6875rem", // ~11px
    lh: 1.55,
    tw: "text-[0.6875rem] leading-[1.55]",
  },

  /** Contact line / link row — same size as entryMeta. */
  metaSmall: {
    rem: "0.625rem",  // ~10px
    lh: 1.3,
    tw: "text-[0.625rem] leading-snug",
  },
} as const;

export type TypeScaleKey = keyof typeof TS;
