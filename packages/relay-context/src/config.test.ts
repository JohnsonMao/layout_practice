import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { RELAY_PROVIDER_OPTIONS, getRelayProviderFromEnv } from './config'

describe('relay-context config', () => {
  const origEnv = process.env

  beforeEach(() => {
    process.env = { ...origEnv }
  })

  afterEach(() => {
    process.env = origEnv
  })

  it('RELAY_PROVIDER_OPTIONS includes cursor-cli and copilot-sdk', () => {
    expect(RELAY_PROVIDER_OPTIONS).toContain('cursor-cli')
    expect(RELAY_PROVIDER_OPTIONS).toContain('copilot-sdk')
  })

  it('getRelayProviderFromEnv returns default when RELAY_PROVIDER unset', () => {
    delete process.env.RELAY_PROVIDER
    expect(getRelayProviderFromEnv()).toBe('cursor-cli')
  })

  it('getRelayProviderFromEnv returns value when RELAY_PROVIDER is valid', () => {
    process.env.RELAY_PROVIDER = 'copilot-sdk'
    expect(getRelayProviderFromEnv()).toBe('copilot-sdk')
    process.env.RELAY_PROVIDER = 'cursor-cli'
    expect(getRelayProviderFromEnv()).toBe('cursor-cli')
  })

  it('getRelayProviderFromEnv returns default when RELAY_PROVIDER is invalid', () => {
    process.env.RELAY_PROVIDER = 'unknown'
    expect(getRelayProviderFromEnv()).toBe('cursor-cli')
  })
})
