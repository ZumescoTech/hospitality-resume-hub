/**
 * Test helpers for exercising the real PDF render layer (src/lib/pdf/ResumePDF.tsx).
 *
 * The premium "template" components in src/components/templates/premium are the
 * *browser preview* (plain HTML/DOM). The downloadable PDF is produced entirely
 * by ResumePDF, whose visual variant is chosen from data.templateId. So these
 * helpers render ResumePDF (not the preview components) to a real PDF buffer and
 * pull text back out with pdfjs — including per-glyph positions for geometry
 * assertions (e.g. header name/subtitle overlap).
 */
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { ResumeData } from "@/types/resume";
import { ResumePDF } from "@/lib/pdf/ResumePDF";

// pdfjs-dist legacy build is the Node-compatible entry point.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadPdfjs(): Promise<any> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Vitest's jsdom-flavoured globals make pdfjs think it's in a browser and
  // demand a real worker. Point it at the legacy worker file so its fake-worker
  // fallback can import it on the main thread.
  const { createRequire } = await import("node:module");
  const require = createRequire(import.meta.url);
  const { pathToFileURL } = await import("node:url");
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.min.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
  return pdfjs;
}

export interface PdfTextItem {
  str: string;
  /** pdf.js transform matrix [a, b, c, d, e, f]; e = x, f = y (baseline). */
  transform: number[];
  width: number;
  height: number;
}

/** Render a given template id to a real PDF buffer via ResumePDF. */
export async function renderPdfBuffer(
  data: ResumeData,
  templateId: string,
): Promise<Buffer> {
  const withTemplate: ResumeData = { ...data, templateId };
  return renderToBuffer(createElement(ResumePDF, { data: withTemplate }));
}

/** Extract every positioned text item from page 1. */
export async function extractTextItems(buffer: Buffer): Promise<PdfTextItem[]> {
  const pdfjs = await loadPdfjs();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    useSystemFonts: true,
    // Silence noisy font/standard-font-data warnings in the test log.
    verbosity: 0,
  }).promise;
  const page = await doc.getPage(1);
  const content = await page.getTextContent();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = content.items.map((i: any) => ({
    str: i.str as string,
    transform: i.transform as number[],
    width: i.width as number,
    height: i.height as number,
  }));
  await doc.destroy();
  return items;
}

/** Flatten page-1 text into a single string (whitespace-joined). */
export async function extractPlainText(buffer: Buffer): Promise<string> {
  const items = await extractTextItems(buffer);
  return items.map((i) => i.str).join(" ");
}

/**
 * Find the first text item whose string contains `needle`.
 * PDF text is often split across multiple runs, so this matches a substring
 * against each run's own text.
 */
export function findItem(items: PdfTextItem[], needle: string): PdfTextItem | undefined {
  return items.find((i) => i.str.includes(needle));
}

/** Vertical bounds of a text run in pdf.js page space (origin bottom-left, y up). */
export function verticalBounds(item: PdfTextItem): { top: number; bottom: number } {
  const baseline = item.transform[5];
  const height = item.height || item.transform[3];
  // Baseline sits near the bottom of the glyph box; ascenders rise above it.
  return { top: baseline + height, bottom: baseline };
}
