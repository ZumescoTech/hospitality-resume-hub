import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ResumeData } from "@/types/resume";
import { defaultFormatting } from "@/types/formatting";
import { getTemplate } from "@/components/templates/registry";
import { getTemplateColours, templateSupportsColours } from "@/lib/template-colours";

const PAGE_W = 794; // A4 width at 96 dpi — same as the preview page

/**
 * PrintableCv
 *
 * Full-size, unscaled copy of the preview, portalled to <body>. Hidden on
 * screen; under @media print it is the only thing shown (see styles.css), so
 * "Download PDF" produces exactly what the preview shows. Renders the same
 * template component with the same formatting and colours as PreviewPanel.
 */
export function PrintableCv({ data }: { data: ResumeData }) {
  // Portal target only exists client-side.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const fmt = data.formatting ?? defaultFormatting;
  const templateId = data.templateId ?? "classic";
  const { Component: TemplateComponent } = getTemplate(templateId);
  const colours = templateSupportsColours(templateId)
    ? getTemplateColours(templateId, data.templateColours)
    : undefined;

  return createPortal(
    <div className="cv-print-root" data-testid="cv-print-root" aria-hidden="true">
      <div
        style={{
          width: PAGE_W,
          fontFamily: `"${fmt.fontFamily}", sans-serif`,
          fontSize: `${fmt.bodyFontSize}pt`,
          lineHeight: fmt.lineSpacing,
        }}
      >
        <TemplateComponent data={data} colours={colours} />
      </div>
    </div>,
    document.body,
  );
}
