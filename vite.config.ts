import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsConfigPaths from 'vite-tsconfig-paths'

const root = fileURLToPath(new URL('.', import.meta.url))
const cfWorkersStub = path.join(root, 'tests/__mocks__/cloudflare-workers.ts')

/** Resolve `cloudflare:workers` only in the browser bundle. Worker/SSR keeps the runtime module. */
function aliasCloudflareWorkersOnClient(): Plugin {
  return {
    name: 'alias-cloudflare-workers-on-client',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (id !== 'cloudflare:workers') return
      if (options.ssr) return
      return cfWorkersStub
    },
  }
}

export default defineConfig(({ mode }) => ({
  // Synthetic client settings prevent saving tests from contacting real accounts
  // or recording test CVs in analytics. Playwright intercepts this test origin.
  define: process.env.GETHIRED_LOCAL_SAVE_TEST === '1' ? {
    'import.meta.env.VITE_SUPABASE_URL': JSON.stringify('https://saving-tests.supabase.co'),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify('local-saving-test-key'),
    'import.meta.env.VITE_CLARITY_PROJECT_ID': JSON.stringify(''),
  } : undefined,
  plugins: [
    aliasCloudflareWorkersOnClient(),
    // Explicit local saving tests do not call Workers AI or remote bindings.
    // Normal development and deployment retain the existing configuration.
    cloudflare({
      configPath: mode === 'staging' ? 'wrangler.staging.jsonc' : undefined,
      viteEnvironment: { name: 'ssr' },
      remoteBindings: process.env.GETHIRED_LOCAL_SAVE_TEST !== '1',
    }),
    tanstackStart(),
    viteReact(),
    tailwindcss(),
    tsConfigPaths({ projects: ['./tsconfig.json'] }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
    dedupe: ['react', 'react-dom', '@tanstack/react-router'],
  },
}))
