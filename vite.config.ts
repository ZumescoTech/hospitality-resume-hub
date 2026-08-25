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

export default defineConfig({
  plugins: [
    aliasCloudflareWorkersOnClient(),
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
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
})
