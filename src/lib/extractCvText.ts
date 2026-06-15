// extractCvText.ts
//
// Client-side only. Converts an uploaded File into a plain-text string
// for the CV checker pipeline. The rating logic receives the same plain
// string regardless of whether the source was .txt, .docx, or .pdf.
//
// For image-based PDFs (scanned pages, design-tool exports, etc.) pdfjs
// returns < 50 chars. In that case we attempt OCR via Tesseract.js before
// falling back to the manual-paste UI shown in builder.tsx.

import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore — Vite ?url import for the worker bundle
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set the worker once, lazily (safe to call multiple times).
let workerInitialised = false;
function initPdfWorker() {
  if (workerInitialised) return;
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  workerInitialised = true;
}

// ─── .txt ─────────────────────────────────────────────────────────────────────

function extractTextFromTxt(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => resolve((ev.target?.result as string) ?? '');
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

// ─── .docx ────────────────────────────────────────────────────────────────────

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

// ─── OCR via Tesseract.js (lazy-loaded) ───────────────────────────────────────

/** Max pages to OCR — keeps processing time reasonable for long CVs. */
const OCR_MAX_PAGES = 3;
/** Abort OCR if it hasn't finished within this many ms. */
const OCR_TIMEOUT_MS = 25_000;

/**
 * Renders the first OCR_MAX_PAGES pages of an already-loaded PDFDocumentProxy
 * to canvas elements, then runs Tesseract OCR on each image.
 * Returns the combined text, or an empty string if OCR fails/times out.
 */
async function ocrPdfPages(pdf: pdfjs.PDFDocumentProxy): Promise<string> {
  // Lazy-load Tesseract only when needed (saves ~2 MB from the initial bundle)
  const { createWorker } = await import('tesseract.js');

  const worker = await createWorker('eng', 1, {
    // Suppress verbose Tesseract logging in the console
    logger: () => undefined,
  });

  const pagesToProcess = Math.min(pdf.numPages, OCR_MAX_PAGES);
  const pageTexts: string[] = [];

  const ocrWork = async () => {
    for (let i = 1; i <= pagesToProcess; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 }); // 2× scale improves OCR accuracy

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport, canvas }).promise;

      const { data } = await worker.recognize(canvas);
      pageTexts.push(data.text);
    }
    await worker.terminate();
    return pageTexts.join('\n\n').replace(/ {2,}/g, ' ').trim();
  };

  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve(''), OCR_TIMEOUT_MS)
  );

  try {
    return await Promise.race([ocrWork(), timeout]);
  } catch {
    try { await worker.terminate(); } catch { /* ignore */ }
    return '';
  }
}

// ─── .pdf ─────────────────────────────────────────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  initPdfWorker();
  const arrayBuffer = await file.arrayBuffer();

  let pdf: pdfjs.PDFDocumentProxy;
  try {
    pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  } catch {
    throw new Error(
      "We couldn't read text from this PDF — it may be encrypted or corrupted. Try uploading a .docx instead."
    );
  }

  // ── Stage 1: selectable text via pdfjs ────────────────────────────────────
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  const combined = pageTexts.join('\n\n').replace(/ {2,}/g, ' ').trim();
  if (combined.length >= 50) return combined;

  // ── Stage 2: OCR fallback ─────────────────────────────────────────────────
  const ocrText = await ocrPdfPages(pdf);
  if (ocrText.length >= 50) return ocrText;

  // ── Stage 3: manual paste (throw so builder.tsx shows the paste panel) ────
  throw new Error(
    "We couldn't read text from this PDF — it may be a scanned image. Try uploading a .docx instead."
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  let text: string;

  if (file.type === 'text/plain' || name.endsWith('.txt')) {
    text = await extractTextFromTxt(file);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    text = await extractTextFromDocx(file);
  } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    text = await extractTextFromPdf(file);
  } else {
    throw new Error(
      'Unsupported file type. Please upload a .pdf, .docx, or .txt file.'
    );
  }

  if (text.trim().length < 50) {
    throw new Error(
      "We couldn't extract enough text from this file. Try copying and pasting your CV text directly."
    );
  }

  return text;
}
