// extraction-error.ts
// Structured error class for CV file extraction failures.
// Every failure path in extractCvText.ts throws an ExtractionError with a
// specific reasonCode — the catch block in cruise-cv-checker.tsx switches
// on reasonCode instead of string-matching error messages.

export const EXTRACTION_REASON_CODES = [
  'no_text_layer',
  'encrypted_pdf',
  'corrupted_pdf',
  'password_protected',
  'file_too_large',
  'too_many_pages',
  'legacy_doc',
  'unsupported_mime',
  'extraction_garbled',
  'insufficient_text',
  'mammoth_failure',
  'pdfjs_internal_error',
  'filereader_error',
  'client_timeout',
  'ocr_timeout',
  'parser_exception',
] as const;

export type ExtractionReasonCode = (typeof EXTRACTION_REASON_CODES)[number];

export class ExtractionError extends Error {
  readonly reasonCode: ExtractionReasonCode;
  /** Which processing stage was active when the error occurred. */
  readonly stage: 'reading' | 'extracting' | 'analyzing' | 'unknown';
  /** Page count if known at point of failure (PDF only). */
  readonly pageCount?: number;

  constructor(
    reasonCode: ExtractionReasonCode,
    userMessage: string,
    options?: {
      stage?: 'reading' | 'extracting' | 'analyzing' | 'unknown';
      pageCount?: number;
      cause?: unknown;
    },
  ) {
    super(userMessage, { cause: options?.cause });
    this.name = 'ExtractionError';
    this.reasonCode = reasonCode;
    this.stage = options?.stage ?? 'unknown';
    this.pageCount = options?.pageCount;
  }
}
