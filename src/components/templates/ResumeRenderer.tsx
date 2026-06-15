import { ResumeData } from "@/types/resume";
import { defaultFormatting } from "@/types/formatting";
import { getTemplate } from "./registry";

interface ResumeRendererProps {
  /** Structured resume data conforming to ResumeData */
  data: ResumeData;
  /** Template identifier — must match a registry id (e.g. "classic", "tokyo", "cellar").
   *  Defaults to "classic" when omitted or unknown. */
  template?: string;
  /** Optional CSS transform scale for zoom (default 1) */
  scale?: number;
}

/**
 * ResumeRenderer
 *
 * Single-responsibility component that:
 *  1. Resolves the correct template component via the registry (falls back to Classic).
 *  2. Renders it inside an A4-proportioned container (794 × 1123 px at 96 dpi).
 *
 * Usage:
 *   <ResumeRenderer data={resumeData} template="tokyo" scale={0.8} />
 */
export function ResumeRenderer({ data, template, scale = 1 }: ResumeRendererProps) {
  // Resolve template — getTemplate returns TEMPLATES[0] (classic) when id is unknown
  const resolvedId = template ?? data.templateId ?? "classic";
  const tpl = getTemplate(resolvedId);
  const TemplateComponent = tpl.Component;

  const fmt = data.formatting ?? defaultFormatting;

  return (
    <div
      className="print-area bg-white shadow-elegant"
      style={{
        width: 794,           // A4 width at 96 dpi
        minHeight: 1123,      // A4 height at 96 dpi
        transform: `scale(${scale})`,
        transformOrigin: "top center",
        // Collapse the extra vertical space created by scale-down
        marginBottom: scale < 1 ? `${(scale - 1) * 1123}px` : 0,
        // Font hints — templates can override with their own fontFamily inline style.
        // Margin/padding is intentionally NOT applied here; each template owns its own
        // internal padding. Margin settings only apply to the PDF export layer.
        fontFamily: `"${fmt.fontFamily}", sans-serif`,
        fontSize: `${fmt.bodyFontSize}pt`,
        lineHeight: fmt.lineSpacing,
      }}
    >
      <TemplateComponent data={data} />
    </div>
  );
}
