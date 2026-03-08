import { describe, expect, it } from 'vitest'
import { createRateLimiter, isRepoAllowed, parseAllowlist } from './rate-limit.js'

describe('createRateLimiter', () => {
  it('allows requests under limit', () => {
    const limiter = createRateLimiter({ maxPerWindow: 2, windowMs: 10_000 })
    expect(limiter.check('repo1')).toBe(true)
    limiter.record('repo1')
    expect(limiter.check('repo1')).toBe(true)
    limiter.record('repo1')
    expect(limiter.check('repo1')).toBe(false)
  })

  it('keys are independent', () => {
    const limiter = createRateLimiter({ maxPerWindow: 1, windowMs: 10_000 })
    limiter.record('a')
    expect(limiter.check('a')).toBe(false)
    expect(limiter.check('b')).toBe(true)
  })
})

describe('parseAllowlist', () => {
  it('returns null for empty or undefined', () => {
    expect(parseAllowlist(undefined)).toBe(null)
    expect(parseAllowlist('')).toBe(null)
    expect(parseAllowlist('   ')).toBe(null)
  })

  it('returns set of owner/repo', () => {
    const set = parseAllowlist('org/repo1, org/repo2')
    expect(set).not.toBe(null)
    if (set) {
      expect(set.has('org/repo1')).toBe(true)
      expect(set.has('org/repo2')).toBe(true)
      expect(set.size).toBe(2)
    }
  })
})

describe('isRepoAllowed', () => {
  it('allows all when allowlist is null', () => {
    expect(isRepoAllowed('a', 'b', null)).toBe(true)
  })

  it('allows only listed repos', () => {
    const allowlist = new Set(['org/repo1'])
    expect(isRepoAllowed('org', 'repo1', allowlist)).toBe(true)
    expect(isRepoAllowed('org', 'repo2', allowlist)).toBe(false)
  })
})
