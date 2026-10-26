// start.ts
// TanStack Start instance. Request middleware captures server logs for the
// temporary /tools/logs page (see src/lib/debug-log.ts).

import { createMiddleware, createStart } from '@tanstack/react-start';

const debugLogMiddleware = createMiddleware().server(async ({ next }) => {
  const { installConsoleCapture, flushDebugLogs } = await import('@/lib/debug-log');
  installConsoleCapture();
  try {
    return await next();
  } catch (err) {
    console.error('[request] unhandled error', err);
    throw err;
  } finally {
    await flushDebugLogs();
  }
});

export const startInstance = createStart(() => ({
  requestMiddleware: [debugLogMiddleware],
}));
