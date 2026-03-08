import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['@octokit/rest', '@octokit/webhooks', 'dotenv'],
})
