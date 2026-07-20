// upload-failure-log.ts
// Server function to record client-side upload/extraction failures in KV.
// Fire-and-forget — failures to log never affect the user flow.
//
// IMPORTANT: This file is imported in client-side route components.
// It must NOT import 'cloudflare:workers' or any server-only module.
// KV operations are delegated to upload-failure-kv.ts (server-only).

import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';

const LogSchema = z.object({
  sessionId: z.string().min(1),
  reasonCode: z.string().min(1),
  stage: z.string().optional(),
  fileMeta: z.object({
    size: z.number(),
    mimeType: z.string(),
    extension: z.string(),
    pageCount: z.number().nullable().optional(),
  }),
  errorMessage: z.string().optional(),
  errorStack: z.string().optional(),
  timestamp: z.string(),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logUploadFailure = createServerFn({ method: 'POST' }).handler(async (ctx: any): Promise<{ ok: boolean }> => {
  try {
    const entry = LogSchema.parse(ctx.data);
    // Dynamic import to keep cloudflare:workers out of the client bundle.
    // This code only runs on the server (inside createServerFn handler).
    const { writeUploadFailure } = await import('@/lib/upload-failure-kv');
    const ok = await writeUploadFailure(entry);
    return { ok };
  } catch {
    return { ok: false };
  }
});
