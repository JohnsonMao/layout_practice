import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runRelay } from './relay.js'

vi.mock('@agent-relay/relay-context', () => ({
  createRelayContext: () => ({
    getRelayForSession: () => ({
      runStream: async function* (request: { prompt: string }) {
        if (request.prompt === 'fail')
          yield { type: 'error', error: { code: 'ERR', message: 'User-facing error' } }
        else
          yield { type: 'text', text: 'Hello' }
        yield { type: 'done' }
      },
    }),
    getRunStreamUnavailableMessage: () => 'Relay unavailable',
  }),
}))

describe('runRelay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns success with collected text', async () => {
    const outcome = await runRelay('hello', process.cwd())
    expect(outcome.success).toBe(true)
    if (outcome.success) expect(outcome.result).toBe('Hello')
  })

  it('returns user-facing error when stream yields error chunk', async () => {
    const outcome = await runRelay('fail', process.cwd())
    expect(outcome.success).toBe(false)
    if (!outcome.success) expect(outcome.userMessage).toBe('User-facing error')
  })
})
