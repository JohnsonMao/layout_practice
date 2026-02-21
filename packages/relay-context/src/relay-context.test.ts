import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createRelayContext } from './relay-context'
import * as config from './config'

const mockRelay = {
  runStream: async function* () {
    yield { type: 'done' as const }
  },
}

const mockProviderCursor = {
  executeStream: async function* () {
    yield { type: 'done' as const }
  },
}

const mockProviderCopilot = {
  createChat: vi.fn(async () => ({ chatId: 'mock-copilot-session' })),
  executeStream: async function* () {
    yield { type: 'done' as const }
  },
}

vi.mock('./config', () => ({
  getRelayProviderFromEnv: vi.fn(() => 'cursor-cli' as const),
  RELAY_PROVIDER_OPTIONS: ['cursor-cli', 'copilot-sdk'] as const,
}))

vi.mock('@agent-relay/core', () => ({
  createRelay: vi.fn(() => mockRelay),
}))

vi.mock('@agent-relay/provider-cursor-cli', () => ({
  createCursorCliProvider: vi.fn(() => mockProviderCursor),
}))

vi.mock('@agent-relay/provider-copilot-sdk', () => ({
  createCopilotProvider: vi.fn(() => mockProviderCopilot),
  toUserFacingError: vi.fn((err: unknown) => (err instanceof Error ? err.message : String(err))),
}))

describe('createRelayContext', () => {
  beforeEach(() => {
    vi.mocked(config.getRelayProviderFromEnv).mockReturnValue('cursor-cli')
  })

  it('returns context with activeProviderDisplayName and activeProviderKind from env', () => {
    const ctx = createRelayContext()
    expect(ctx.activeProviderDisplayName).toBe('Cursor CLI')
    expect(ctx.activeProviderKind).toBe('cursor-cli')
  })

  it('when RELAY_PROVIDER is copilot-sdk, sets display name and kind to Copilot', () => {
    vi.mocked(config.getRelayProviderFromEnv).mockReturnValue('copilot-sdk')
    const ctx = createRelayContext()
    expect(ctx.activeProviderDisplayName).toBe('Copilot')
    expect(ctx.activeProviderKind).toBe('copilot-sdk')
  })

  it('getRelayForSession returns relay for session.provider when set', () => {
    const ctx = createRelayContext()
    expect(ctx.getRelayForSession({ provider: 'cursor-cli' })).toBe(mockRelay)
    expect(ctx.getRelayForSession({ provider: 'copilot-sdk' })).toBeNull()
  })

  it('getRelayForSession falls back to active provider when session.provider is omitted', () => {
    vi.mocked(config.getRelayProviderFromEnv).mockReturnValue('cursor-cli')
    const ctx = createRelayContext()
    expect(ctx.getRelayForSession({})).toBe(mockRelay)
    vi.mocked(config.getRelayProviderFromEnv).mockReturnValue('copilot-sdk')
    const ctx2 = createRelayContext()
    expect(ctx2.getRelayForSession({})).toBe(mockRelay)
  })

  it('getRunStreamUnavailableMessage returns generic message', () => {
    const ctx = createRelayContext()
    expect(ctx.getRunStreamUnavailableMessage({})).toContain('Relay backend is not available')
    expect(ctx.getRunStreamUnavailableMessage({ provider: 'copilot-sdk' })).toContain('RELAY_PROVIDER')
  })

  it('formatCreateChatError returns message from active provider (cursor-cli)', () => {
    const ctx = createRelayContext()
    const err = new Error('cursor error')
    expect(ctx.formatCreateChatError(err)).toBe('cursor error')
  })

  it('formatCreateChatError uses toUserFacingError when active is copilot-sdk', () => {
    vi.mocked(config.getRelayProviderFromEnv).mockReturnValue('copilot-sdk')
    const ctx = createRelayContext()
    const err = new Error('copilot auth failed')
    expect(ctx.formatCreateChatError(err)).toBe('copilot auth failed')
  })
})
