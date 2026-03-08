import { describe, expect, it } from 'vitest'
import { getDefaultModelFromEnv, resolveConfig } from './config'
import { createGeminiProvider, toUserFacingError } from './provider'

describe('config', () => {
  it('resolveConfig uses overrides', () => {
    const r = resolveConfig({ apiKey: 'override-key', model: 'override-model', timeoutMs: 10 })
    expect(r.apiKey).toBe('override-key')
    expect(r.model).toBe('override-model')
    expect(r.timeoutMs).toBe(10)
  })

  it('resolveConfig defaults when empty config', () => {
    const r = resolveConfig({})
    expect(r.model).toBeTruthy()
    expect(r.timeoutMs).toBe(300_000)
  })

  it('getDefaultModelFromEnv returns a non-empty string', () => {
    expect(getDefaultModelFromEnv()).toBeTruthy()
  })
})

describe('toUserFacingError', () => {
  it('maps api key / 401 to user message', () => {
    expect(toUserFacingError(new Error('Invalid API key'))).toContain('GEMINI_API_KEY')
    expect(toUserFacingError(new Error('401 Unauthorized'))).toContain('GEMINI_API_KEY')
  })

  it('maps 429 / rate limit to user message', () => {
    expect(toUserFacingError(new Error('429 Resource Exhausted'))).toContain('rate limit')
  })

  it('maps timeout to user message', () => {
    expect(toUserFacingError(new Error('ETIMEDOUT'))).toContain('timed out')
  })

  it('passes through other errors', () => {
    expect(toUserFacingError(new Error('custom'))).toBe('custom')
  })
})

describe('createGeminiProvider', () => {
  it('execute returns GEMINI_AUTH_ERROR when API key not set', async () => {
    const provider = createGeminiProvider({ apiKey: '' })
    const res = await provider.execute({
      prompt: 'hi',
      workspace: '/tmp',
    })
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.error.code).toBe('GEMINI_AUTH_ERROR')
      expect(res.error.message).toContain('GEMINI_API_KEY')
    }
  })

  it('executeStream yields error when API key not set', async () => {
    const provider = createGeminiProvider({ apiKey: '' })
    const chunks: Array<{ type: string, error?: { code: string } }> = []
    for await (const ch of provider.executeStream({ prompt: 'hi', workspace: '/tmp' })) {
      chunks.push(ch as { type: string, error?: { code: string } })
    }
    expect(chunks.length).toBe(1)
    expect(chunks[0].type).toBe('error')
    expect(chunks[0].error?.code).toBe('GEMINI_AUTH_ERROR')
  })

  it('createChat throws with clear message', async () => {
    const provider = createGeminiProvider({ apiKey: 'test-key' })
    await expect(provider.createChat()).rejects.toThrow(/does not support createChat/)
  })
})
