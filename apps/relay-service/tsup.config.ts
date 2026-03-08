import { resolve } from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'tsup'

// Load .env from workspace root
config({ path: resolve(__dirname, '../../.env') })

const relayPlatforms = (process.env.RELAY_PLATFORMS ?? '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean)

// If empty, default to true for all (useful for dev)
const isAll = relayPlatforms.length === 0

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  clean: true,
  sourcemap: true,
  outDir: 'dist',
  define: {
    ENABLE_PLATFORM_DISCORD: String(isAll || relayPlatforms.includes('discord')),
    ENABLE_PLATFORM_GITHUB: String(isAll || relayPlatforms.includes('github')),
  },
  noExternal: [
    '@agent-relay/core',
    '@agent-relay/platform-discord',
    '@agent-relay/platform-github',
    '@agent-relay/provider-copilot-sdk',
    '@agent-relay/provider-cursor-cli',
    '@agent-relay/provider-gemini',
  ],
})
