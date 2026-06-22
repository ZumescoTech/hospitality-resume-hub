// extractCvText.ts
//
// Client-side only. Converts an uploaded File into a plain-text string
// for the CV checker pipeline. The rating logic receives the same plain
// string regardless of whether the source was .txt, .docx, or .pdf.
//
// An optional ExtractionProgressCallback lets callers track staged progress:
//   reading   0-10%   file being read from disk
//   extracting 10-70%  text parsed / OCR running (real Tesseract increments)
//
// For image-based PDFs (scanned pages, design-tool exports, etc.) pdfjs
// returns < 50 chars. In that case we attempt OCR via Tesseract.js before
// falling back to the manual-paste UI shown in builder.tsx.

import * as mammoth from 'mammoth';
import * as pdfjs from 'pdfjs-dist';
// @ts-ignore — Vite ?url import for the worker bundle
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set the worker once, lazily (safe to call multiple times).
// On iOS Safari < 15, module workers (type: "module") are not supported and
// throw a DOMException. We detect this and fall back to pdfjs fake-worker
// (in-thread) mode by setting workerSrc = '', which is supported in v4.
let workerInitialised = false;
function initPdfWorker() {
  if (workerInitialised) return;
  workerInitialised = true;
  try {
    const testWorker = new Worker('data:text/javascript,', { type: 'module' });
    testWorker.terminate();
    pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  } catch {
    console.warn('[pdfjs] Module workers not supported — falling back to in-thread mode');
    pdfjs.GlobalWorkerOptions.workerSrc = '';
  }
}

// ─── Blob.arrayBuffer() polyfill ──────────────────────────────────────────────
// Blob.arrayBuffer() is only available from iOS Safari 14.5+.
// FileReader.readAsArrayBuffer() works back to iOS 9 and is the safe fallback.
function readArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof file.arrayBuffer === 'function') {
    return file.arrayBuffer();
  }
  return new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── Progress callback ─────────────────────────────────────────────────────────

export type ExtractionProgressCallback = (update: {
  stage: 'reading' | 'extracting';
  percent: number;
  /** Override the default label for this stage (e.g. "Reading scanned PDF (OCR)..."). */
  label?: string;
}) => void;

// ─── .txt ─────────────────────────────────────────────────────────────────────

function extractTextFromTxt(
  file: File,
  onProgress?: ExtractionProgressCallback,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // FileReader.onprogress fires multiple times during read — map to 0-10%.
    reader.onprogress = (ev) => {
      if (ev.lengthComputable && onProgress) {
        onProgress({ stage: 'reading', percent: (ev.loaded / ev.total) * 10 });
      }
    };

    reader.onload = (ev) => {
      onProgress?.({ stage: 'extracting', percent: 70 }); // txt needs no parse step
      resolve((ev.target?.result as string) ?? '');
    };
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsText(file);
  });
}

// ─── .docx ────────────────────────────────────────────────────────────────────

async function extractTextFromDocx(
  file: File,
  onProgress?: ExtractionProgressCallback,
): Promise<string> {
  onProgress?.({ stage: 'reading', percent: 0 });
  const arrayBuffer = await readArrayBuffer(file);
  // readArrayBuffer() has no progress events — jump straight to 10%.
  onProgress?.({ stage: 'extracting', percent: 10 });
  const result = await mammoth.extractRawText({ arrayBuffer });
  onProgress?.({ stage: 'extracting', percent: 70 });
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
 *
 * Real OCR progress is reported via onProgress: as Tesseract works through each
 * page, the percent moves incrementally through the 10-70% band.
 */
async function ocrPdfPages(
  pdf: pdfjs.PDFDocumentProxy,
  onProgress?: ExtractionProgressCallback,
): Promise<string> {
  // Lazy-load Tesseract only when needed (saves ~2 MB from the initial bundle)
  const { createWorker } = await import('tesseract.js');

  const pagesToProcess = Math.min(pdf.numPages, OCR_MAX_PAGES);

  // currentPageIdx is mutated during the loop so the logger closure sees the
  // correct page index without needing to recreate the worker per page.
  let currentPageIdx = 0;

  const worker = await createWorker('eng', 1, {
    logger: (m: { status: string; progress: number }) => {
      if (m.status === 'recognizing text' && onProgress) {
        // Map (pageIdx + pageProgress) / totalPages → 10-70% range.
        const overall = (currentPageIdx + m.progress) / pagesToProcess;
        onProgress({
          stage: 'extracting',
          percent: 10 + overall * 60,
          label: 'Reading scanned PDF (OCR)...',
        });
      }
    },
  });

  const pageTexts: string[] = [];

  const ocrWork = async () => {
    for (let i = 1; i <= pagesToProcess; i++) {
      currentPageIdx = i - 1; // 0-indexed for the logger formula

      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2 }); // 2× scale improves OCR accuracy

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d')!;

      await page.render({ canvasContext: ctx, viewport }).promise;

      const { data } = await worker.recognize(canvas);
      pageTexts.push(data.text);
    }
    await worker.terminate();
    return pageTexts.join('\n\n').replace(/ {2,}/g, ' ').trim();
  };

  const timeout = new Promise<string>((resolve) =>
    setTimeout(() => resolve(''), OCR_TIMEOUT_MS),
  );

  try {
    return await Promise.race([ocrWork(), timeout]);
  } catch {
    try { await worker.terminate(); } catch { /* ignore */ }
    return '';
  }
}

// ─── .pdf ─────────────────────────────────────────────────────────────────────

async function extractTextFromPdf(
  file: File,
  onProgress?: ExtractionProgressCallback,
): Promise<string> {
  initPdfWorker();
  onProgress?.({ stage: 'reading', percent: 0 });

  const arrayBuffer = await readArrayBuffer(file);
  // readArrayBuffer() has no progress events — jump to 10% on completion.
  onProgress?.({ stage: 'extracting', percent: 10 });

  let pdf: pdfjs.PDFDocumentProxy;
  try {
    pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  } catch {
    throw new Error(
      "We couldn't read text from this PDF — it may be encrypted or corrupted. Try uploading a .docx instead.",
    );
  }

  // ── Stage 1: selectable text via pdfjs ────────────────────────────────────
  const pageTexts: string[] = [];
  try {
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ');
      pageTexts.push(pageText);
    }
  } catch {
    throw new Error(
      "We couldn't extract text from this PDF. It may be encrypted or corrupted.",
    );
  }

  const combined = pageTexts.join('\n\n').replace(/ {2,}/g, ' ').trim();
  if (combined.length >= 50) {
    // Selectable text found — skip OCR, jump to 70%.
    onProgress?.({ stage: 'extracting', percent: 70 });
    return combined;
  }

  // ── Stage 2: OCR fallback (real incremental progress 10-70%) ──────────────
  const ocrText = await ocrPdfPages(pdf, onProgress);
  if (ocrText.length >= 50) return ocrText;

  // ── Stage 3: manual paste (throw so caller shows the paste panel) ──────────
  throw new Error(
    "We couldn't read text from this PDF — it may be a scanned image. Try uploading a .docx instead.",
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

export async function extractTextFromFile(
  file: File,
  onProgress?: ExtractionProgressCallback,
): Promise<string> {
  const name = file.name.toLowerCase();

  let text: string;

  if (file.type === 'text/plain' || name.endsWith('.txt')) {
    text = await extractTextFromTxt(file, onProgress);
  } else if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) {
    text = await extractTextFromDocx(file, onProgress);
  } else if (file.type === 'application/pdf' || name.endsWith('.pdf')) {
    text = await extractTextFromPdf(file, onProgress);
  } else {
    throw new Error(
      'Unsupported file type. Please upload a .pdf, .docx, or .txt file.',
    );
  }

  if (text.trim().length < 50) {
    throw new Error(
      "We couldn't extract enough text from this file. Try copying and pasting your CV text directly.",
    );
  }

  return text;
}
