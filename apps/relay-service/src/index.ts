import 'dotenv/config'
import { loadPlatforms, stopAll } from './loader'
import { createRelayContext } from './context'

async function main() {
  console.log('[RelayService] Starting...')

  const ctx = createRelayContext()
  const platforms = await loadPlatforms()
  if (platforms.length === 0) {
    console.error('[RelayService] No active platforms. Exiting.')
    process.exit(1)
  }

  // Phase 1: Init all
  try {
    for (const p of platforms) {
      console.log(`[RelayService] Initializing ${p.name}...`)
      await p.init(ctx)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[RelayService] Initialization failed: ${msg}`)
    process.exit(1) // Fail-fast
  }

  // Phase 2: Start all
  try {
    for (const p of platforms) {
      console.log(`[RelayService] Starting ${p.name}...`)
      await p.start()
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[RelayService] Startup failed: ${msg}`)
    // On startup failure, try to stop already started ones
    await stopAll(platforms)
    process.exit(1)
  }

  console.log('[RelayService] All platforms started.')

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    console.log(`[RelayService] Received ${signal}. Shutting down...`)
    await stopAll(platforms)
    process.exit(0)
  }

  process.on('SIGINT', () => handleShutdown('SIGINT'))
  process.on('SIGTERM', () => handleShutdown('SIGTERM'))
}

main().catch((err) => {
  console.error('[RelayService] Fatal error:', err)
  process.exit(1)
})
