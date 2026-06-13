// extractCvText.ts
//
// Client-side only. Converts an uploaded File into a plain-text string
// for the CV checker pipeline. The rating logic receives the same plain
// string regardless of whether the source was .txt, .docx, or .pdf.

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

  if (combined.length < 50) {
    throw new Error(
      "We couldn't read text from this PDF — it may be a scanned image. Try uploading a .docx instead."
    );
  }

  return combined;
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
