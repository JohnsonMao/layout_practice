import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  dts: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['discord.js', 'dotenv', 'sql.js'],
})
