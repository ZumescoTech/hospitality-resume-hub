/**
 * CvSection — shared structural primitive.
 *
 * Renders a section heading + content block. Automatically returns null when
 * `empty` is true — no orphaned headings anywhere.
 *
 * Templates supply their own heading renderer via `renderHeading` so they can
 * apply their own colour, decoration and typeface while the empty-guard and
 * structural wrapper are shared.
 */

interface CvSectionProps {
  /** When true the entire section (heading + content) is suppressed. */
  empty: boolean;
  /** Renders the styled section heading — supplied by each template. */
  renderHeading: () => React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function CvSection({ empty, renderHeading, children, className }: CvSectionProps) {
  if (empty) return null;
  return (
    <section className={className}>
      {renderHeading()}
      <div>{children}</div>
    </section>
  );
}
