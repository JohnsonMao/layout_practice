import type { Platform } from '@agent-relay/core'

/**
 * Global flags for tree-shaking, injected by build tool.
 * Defaults to true for runtime/dev.
 */
declare const ENABLE_PLATFORM_DISCORD: boolean
declare const ENABLE_PLATFORM_GITHUB: boolean

const FLAGS = {
  discord: typeof ENABLE_PLATFORM_DISCORD !== 'undefined' ? ENABLE_PLATFORM_DISCORD : true,
  github: typeof ENABLE_PLATFORM_GITHUB !== 'undefined' ? ENABLE_PLATFORM_GITHUB : true,
}

export async function loadPlatforms(): Promise<Platform[]> {
  process.stdout.write(`[RelayService] RELAY_PLATFORMS from env: "${process.env.RELAY_PLATFORMS ?? ''}"\n`)
  const enabledNames = (process.env.RELAY_PLATFORMS ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean)

  if (enabledNames.length === 0) {
    console.warn('[RelayService] No platforms enabled via RELAY_PLATFORMS.')
    return []
  }

  const platforms: Platform[] = []

  for (const name of enabledNames) {
    if (name === 'discord') {
      if (FLAGS.discord) {
        const { PlatformDiscord } = await import('@agent-relay/platform-discord')
        platforms.push(new PlatformDiscord())
      }
      else {
        console.warn('[RelayService] Discord platform is disabled by build flag.')
      }
    }
    else if (name === 'github') {
      if (FLAGS.github) {
        const { PlatformGitHub } = await import('@agent-relay/platform-github')
        platforms.push(new PlatformGitHub())
      }
      else {
        console.warn('[RelayService] GitHub platform is disabled by build flag.')
      }
    }
    else {
      console.warn(`[RelayService] Unknown platform: ${name}`)
    }
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
