/**
 * CvHeader — shared structural primitive for the candidate header block.
 *
 * Handles:
 * - Photo (circular or square, template-supplied border/outline)
 * - Name + job title, safe flex layout with min-w-0 preventing long names
 *   from colliding with the photo
 * - Contact line (location, email, phone, links)
 * - Optional photo placeholder (templates opt-in by passing `photoPlaceholder`)
 *
 * Templates control visual identity via the `tokens` prop (colours, font family,
 * photo shape) and can override name size for dramatic effect.
 */

import { TS } from "./type-scale";
import { PersonalDetails } from "@/types/resume";

export interface CvHeaderTokens {
  nameColor: string;
  titleColor: string;
  contactColor: string;
  /** Optional: override name Tailwind classes. Defaults to TS.name.tw. */
  nameTw?: string;
  /** Photo shape: 'circle' | 'square'. Defaults to 'circle'. */
  photoShape?: "circle" | "square";
  /** Photo size in px. Defaults to 96. */
  photoSize?: number;
  /** Optional ring/border style for photo element. */
  photoStyle?: React.CSSProperties;
  /** Optional element rendered when no photo is present. */
  photoPlaceholder?: React.ReactNode;
  /** Contact separator string. Defaults to '  ·  '. */
  contactSep?: string;
  /** Layout direction: 'row' (photo left, text right) or 'column' (photo above, text centered). */
  layout?: "row" | "column";
}

interface CvHeaderProps {
  personal: PersonalDetails;
  tokens: CvHeaderTokens;
  /** Extra content rendered below contact line (e.g. a decorative rule). */
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function CvHeader({ personal, tokens, children, className, style }: CvHeaderProps) {
  const {
    nameColor,
    titleColor,
    contactColor,
    nameTw = TS.name.tw,
    photoShape = "circle",
    photoSize = 96,
    photoStyle,
    photoPlaceholder,
    contactSep = "  ·  ",
    layout = "row",
  } = tokens;

  const contactParts = [
    personal.location,
    personal.email,
    personal.phone,
    ...(personal.links?.map((l) => l.url) ?? []),
  ].filter(Boolean);

  const photoEl = personal.photo ? (
    <img
      src={personal.photo}
      alt=""
      style={{
        width: photoSize,
        height: photoSize,
        borderRadius: photoShape === "circle" ? "50%" : 4,
        objectFit: "cover",
        flexShrink: 0,
        display: "block",
        ...photoStyle,
      }}
    />
  ) : (
    photoPlaceholder ?? null
  );

  if (layout === "column") {
    return (
      <header className={className} style={style}>
        {photoEl && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            {photoEl}
          </div>
        )}
        <div style={{ textAlign: "center" }}>
          <h1 className={nameTw} style={{ color: nameColor, margin: 0 }}>
            {personal.fullName || "Your Name"}
          </h1>
          {personal.title && (
            <p className={TS.jobTitle.tw} style={{ color: titleColor, marginTop: 4 }}>
              {personal.title}
            </p>
          )}
          {contactParts.length > 0 && (
            <p className={TS.metaSmall.tw} style={{ color: contactColor, marginTop: 8 }}>
              {contactParts.join(contactSep)}
            </p>
          )}
        </div>
        {children}
      </header>
    );
  }

  // Row layout (default)
  return (
    <header
      className={className}
      style={{ display: "flex", alignItems: "center", gap: 20, ...style }}
    >
      {photoEl}
      {/* min-w-0 prevents long names from overflowing into the photo */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h1 className={nameTw} style={{ color: nameColor, margin: 0 }}>
          {personal.fullName || "Your Name"}
        </h1>
        {personal.title && (
          <p className={TS.jobTitle.tw} style={{ color: titleColor, marginTop: 4 }}>
            {personal.title}
          </p>
        )}
        {contactParts.length > 0 && (
          <p className={TS.metaSmall.tw} style={{ color: contactColor, marginTop: 6 }}>
            {contactParts.join(contactSep)}
          </p>
        )}
      </div>
      {children}
    </header>
  );
}
