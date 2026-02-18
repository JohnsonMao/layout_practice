import { describe, it, expect, vi } from 'vitest'
import { createRelay } from './relay'
import type { Provider, RelayRequest, RelayResponse } from './types'

describe('createRelay', () => {
  it('calls provider once and returns its response', async () => {
    const response: RelayResponse = { success: true, result: 'ok' }
    const provider: Provider = {
      execute: vi.fn().mockResolvedValue(response),
    }
    const relay = createRelay({ provider })
    const request: RelayRequest = { prompt: 'hello' }

    const result = await relay.run(request)

    expect(provider.execute).toHaveBeenCalledTimes(1)
    expect(provider.execute).toHaveBeenCalledWith(request)
    expect(result).toEqual(response)
  })

  it('returns error when provider is not configured', async () => {
    const relay = createRelay({ provider: null as unknown as Provider })
    const result = await relay.run({ prompt: 'x' })

    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE')
  })

  it('returns error when provider throws', async () => {
    const provider: Provider = {
      execute: vi.fn().mockRejectedValue(new Error('provider failed')),
    }
    const relay = createRelay({ provider })
    const result = await relay.run({ prompt: 'x' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('PROVIDER_UNAVAILABLE')
      expect(result.error.message).toBe('provider failed')
    }
  })

  it('runStream falls back to run when provider has no executeStream', async () => {
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
})
