import { describe, expect, it } from 'vitest'
import { toUserFacingError } from './provider'

describe('provider-copilot-sdk', () => {
  it('toUserFacingError maps ENOENT to user message', () => {
    expect(toUserFacingError(new Error('ENOENT: spawn copilot'))).toContain('Copilot CLI')
  })

  it('toUserFacingError maps auth to user message', () => {
    expect(toUserFacingError(new Error('401 Unauthorized'))).toContain('COPILOT_GITHUB_TOKEN')
  })

  it('toUserFacingError passes through other errors', () => {
    expect(toUserFacingError(new Error('custom'))).toBe('custom')
  })
})
