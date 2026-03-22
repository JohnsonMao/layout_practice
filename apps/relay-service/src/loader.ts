import { type Platform, PluginRegistry } from '@agent-relay/core'
import { PluginLoader } from './plugin-loader'

export async function loadPlatforms(): Promise<Platform[]> {
  const registry = new PluginRegistry()
  const loader = new PluginLoader(registry)
  await loader.load()

  const allPlatforms = registry.getAllPlatforms()
  // Wait for all platforms to be created
  const platforms = await Promise.all(allPlatforms.map(p => p.create()))

  const enabledNames = (process.env.RELAY_PLATFORMS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (enabledNames.length > 0) {
    return platforms.filter(p => enabledNames.includes(p.name))
  }

  return platforms
}

export async function stopAll(platforms: Platform[]) {
  for (const p of platforms) {
    try {
      process.stdout.write(`[RelayService] Stopping ${p.name}...\n`)
      await p.stop()
    }
    catch (err) {
      console.error(`[RelayService] Error stopping ${p.name}:`, err)
    }
  }
}
