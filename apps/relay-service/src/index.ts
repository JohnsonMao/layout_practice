import { createRelayContext } from './context'
import { loadPlatforms, stopAll } from './loader'
import 'dotenv/config'

async function main() {
  process.stdout.write('[RelayService] Starting...\n')

  const ctx = createRelayContext()
  const platforms = await loadPlatforms()
  if (platforms.length === 0) {
    console.error('[RelayService] No active platforms. Exiting.')
    process.exit(1)
  }

  // Phase 1: Init all
  try {
    for (const p of platforms) {
      process.stdout.write(`[RelayService] Initializing ${p.name}...\n`)
      await p.init(ctx)
    }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[RelayService] Initialization failed: ${msg}`)
    process.exit(1) // Fail-fast
  }

  // Phase 2: Start all
  try {
    for (const p of platforms) {
      process.stdout.write(`[RelayService] Starting ${p.name}...\n`)
      await p.start()
    }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[RelayService] Startup failed: ${msg}`)
    // On startup failure, try to stop already started ones
    await stopAll(platforms)
    process.exit(1)
  }

  process.stdout.write('[RelayService] All platforms started.\n')

  // Graceful shutdown
  const handleShutdown = async (signal: string) => {
    process.stdout.write(`[RelayService] Received ${signal}. Shutting down...\n`)
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
