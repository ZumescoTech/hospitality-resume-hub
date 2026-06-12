/**
 * PDFDownloadButton
 *
 * Renders a styled download link that generates and downloads the resume PDF
 * when clicked. Wraps @react-pdf/renderer's PDFDownloadLink and exposes a
 * variant prop so it can be used in both the header (default) and the
 * preview toolbar (outline).
 *
 * The PDF is generated in a background worker — no UI jank during generation.
 * The button shows a spinner + "Generating…" while the worker finishes, then
 * a download icon + "Download PDF" when ready.
 */
import { PDFDownloadLink } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ResumePDF } from "@/lib/pdf/ResumePDF";
import type { ResumeData } from "@/types/resume";

interface Props {
  data: ResumeData;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default";
  className?: string;
}

/** Map variant → Tailwind classes (mirrors shadcn Button styles). */
const variantClasses: Record<NonNullable<Props["variant"]>, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost:   "hover:bg-accent hover:text-accent-foreground",
};

const sizeClasses: Record<NonNullable<Props["size"]>, string> = {
  sm:      "h-9 rounded-md px-3 text-sm",
  default: "h-10 rounded-md px-4 py-2 text-sm",
};

export function PDFDownloadButton({ data, variant = "default", size = "sm", className }: Props) {
  const fileName = `${(data.personal.fullName || "resume").replace(/\s+/g, "_")}_CV.pdf`;

  return (
    <PDFDownloadLink
      document={<ResumePDF data={data} />}
      fileName={fileName}
      className={cn(
        // Base button styles
        "no-print inline-flex items-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      // Remove the underline that browsers apply to <a> tags
      style={{ textDecoration: "none" }}
    >
      {({ loading, error }) => {
        if (error) {
          return (
            <>
              <Download className="h-4 w-4 opacity-50" />
              <span>Retry PDF</span>
            </>
          );
        }
        if (loading) {
          return (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating…</span>
            </>
          );
        }
        return (
          <>
            <Download className="h-4 w-4" />
            <span>Download PDF</span>
          </>
        );
      }}
    </PDFDownloadLink>
  );
}
