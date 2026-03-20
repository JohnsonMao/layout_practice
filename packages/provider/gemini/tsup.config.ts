import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  minify: false,
  splitting: false,
  external: [
    '@agent-relay/core',
    'dotenv',
    'discord.js',
    'sql.js',
    '@octokit/rest',
    '@octokit/webhooks',
    '@google/genai',
    'vscode-jsonrpc',
    'zod',
  ],
})
