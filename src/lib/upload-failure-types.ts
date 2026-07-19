// upload-failure-types.ts
// Shared types for upload failure logging (safe to import from client or server).

export interface UploadFailureEntry {
  sessionId: string;
  reasonCode: string;
  stage?: string;
  fileMeta: {
    size: number;
    mimeType: string;
    extension: string;
    pageCount?: number | null;
  };
  errorMessage?: string;
  errorStack?: string;
  timestamp: string;
}

export interface DailyUploadFailures {
  date: string;
  total: number;
  byReasonCode: Record<string, number>;
  recentEntries: UploadFailureEntry[];
}
