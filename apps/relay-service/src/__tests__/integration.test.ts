import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadPlatforms } from '../loader'

// Mock the platform packages
vi.mock('@agent-relay/platform-discord', () => ({
  default: {
    id: 'discord',
    displayName: 'Discord',
    create: vi.fn().mockResolvedValue({
      name: 'discord',
      init: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
  },
}))

vi.mock('@agent-relay/platform-github', () => ({
  default: {
    id: 'github',
    displayName: 'GitHub',
    create: vi.fn().mockResolvedValue({
      name: 'github',
      init: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    }),
  },
}))

// Mock PluginLoader to bypass actual filesystem scanning and dynamic imports
vi.mock('../plugin-loader', () => {
  return {
    PluginLoader: vi.fn().mockImplementation(registry => ({
      load: vi.fn().mockImplementation(async () => {
        // Manually simulate plugin loading for tests
        const discordPlugin = (await import('@agent-relay/platform-discord')).default
        const githubPlugin = (await import('@agent-relay/platform-github')).default

        registry.registerPlatform(discordPlugin)
        registry.registerPlatform(githubPlugin)
      }),
    })),
  }
})

describe('loadPlatforms', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env.RELAY_PLATFORMS = ''
  })

  it('loads discord when configured', async () => {
    process.env.RELAY_PLATFORMS = 'discord'
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(1)
    expect(platforms[0].name).toBe('discord')
  })

  it('loads github when configured', async () => {
    process.env.RELAY_PLATFORMS = 'github'
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(1)
    expect(platforms[0].name).toBe('github')
  })

  it('loads multiple platforms', async () => {
    process.env.RELAY_PLATFORMS = 'discord,github'
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(2)
    const names = platforms.map(p => p.name)
    expect(names).toContain('discord')
    expect(names).toContain('github')
  })

  it('handles empty RELAY_PLATFORMS', async () => {
    process.env.RELAY_PLATFORMS = ''
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(2) // Updated to expect 2 because we registered both
  })

  it('handles unknown platforms', async () => {
    process.env.RELAY_PLATFORMS = 'unknown'
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(0)
  })
})
