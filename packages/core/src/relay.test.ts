import { describe, it, expect, vi } from 'vitest'
import { createRelay } from './relay'
import type { Provider, RelayResponse, StreamingProvider } from './types'

describe('createRelay', () => {
  it('runStream yields error when provider is not configured', async () => {
    const relay = createRelay({ provider: null as unknown as Provider })
    const chunks: unknown[] = []
    for await (const c of relay.runStream({ prompt: 'x' }))
      chunks.push(c)

    expect(chunks).toEqual([
      { type: 'error', error: { code: 'PROVIDER_UNAVAILABLE', message: 'No provider configured.' } },
    ])
  })

  it('runStream yields error when provider throws', async () => {
    const provider: Provider = {
      execute: vi.fn().mockRejectedValue(new Error('provider failed')),
    }
    const relay = createRelay({ provider })
    const chunks: unknown[] = []
    for await (const c of relay.runStream({ prompt: 'x' }))
      chunks.push(c)

    expect(chunks).toEqual([
      { type: 'error', error: { code: 'PROVIDER_UNAVAILABLE', message: 'provider failed' } },
    ])
  })

  it('runStream falls back to execute when provider has no executeStream', async () => {
    const response: RelayResponse = { success: true, result: 'stream fallback' }
    const provider: Provider = {
      execute: vi.fn().mockResolvedValue(response),
    }
    const relay = createRelay({ provider })
    const chunks: unknown[] = []
    for await (const c of relay.runStream({ prompt: 'hi' }))
      chunks.push(c)

    expect(chunks).toEqual([
      { type: 'text', text: 'stream fallback' },
      { type: 'done' },
    ])
  })

  it('runStream passes through system chunk from StreamingProvider', async () => {
    const provider: StreamingProvider = {
      execute: vi.fn(),
      async *executeStream() {
        yield { type: 'system', sessionId: 'sid-123' }
        yield { type: 'text', text: 'hi' }
        yield { type: 'done' }
      },
    }
    const relay = createRelay({ provider })
    const chunks: unknown[] = []
    for await (const c of relay.runStream({ prompt: 'x' }))
      chunks.push(c)

    expect(chunks).toEqual([
      { type: 'system', sessionId: 'sid-123' },
      { type: 'text', text: 'hi' },
      { type: 'done' },
    ])
  })
})
