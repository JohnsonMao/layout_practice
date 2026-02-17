import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'deploy-commands': 'src/deploy-commands.ts',
  },
  format: ['esm'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  external: ['discord.js', 'dotenv'],
  noExternal: ['@agent-relay/core', '@agent-relay/provider-cursor-cli'],
})
