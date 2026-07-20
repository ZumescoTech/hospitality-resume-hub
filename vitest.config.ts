import { defineConfig } from 'vitest/config'
import tsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [tsConfigPaths({ projects: ['./tsconfig.json'] })],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/unit/**/*.{test,spec}.{ts,tsx}'],
  },
  resolve: {
    alias: {
      '@': '/src',
      // Stub the Cloudflare Workers runtime module so tests that import code
      // using KV bindings don't crash in Node.js.
      'cloudflare:workers': '/tests/__mocks__/cloudflare-workers.ts',
    },
  },
})
