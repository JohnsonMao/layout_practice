import { describe, it, expect, vi, beforeEach } from 'vitest'
import { loadPlatforms } from '../loader'

// Mock the platform packages
vi.mock('@agent-relay/platform-discord', () => ({
  PlatformDiscord: vi.fn().mockImplementation(() => ({
    name: 'discord',
    init: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
}))

vi.mock('@agent-relay/platform-github', () => ({
  PlatformGitHub: vi.fn().mockImplementation(() => ({
    name: 'github',
    init: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  })),
}))

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
    expect(platforms).toHaveLength(0)
  })

  it('handles unknown platforms', async () => {
    process.env.RELAY_PLATFORMS = 'unknown'
    const platforms = await loadPlatforms()
    expect(platforms).toHaveLength(0)
  })
})
