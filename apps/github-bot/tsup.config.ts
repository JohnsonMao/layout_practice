import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['dotenv', '@agent-relay/core', '@agent-relay/relay-context'],
  noExternal: [],
})
