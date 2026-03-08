import { describe, expect, it } from 'vitest'
import { DEFAULT_MAX_PROMPT_LENGTH, matchTrigger } from './trigger.js'

describe('matchTrigger', () => {
  it('matches /ask prefix and returns prompt', () => {
    const r = matchTrigger('/ask  hello world')
    expect(r.matched).toBe(true)
    if (r.matched)
      expect(r.prompt).toBe('hello world')
  })

  it('matches @bot prefix', () => {
    const r = matchTrigger('@bot summarize this')
    expect(r.matched).toBe(true)
    if (r.matched)
      expect(r.prompt).toBe('summarize this')
  })

  it('returns matched false when no prefix', () => {
    expect(matchTrigger('just a comment').matched).toBe(false)
  })

  it('returns matched false when prefix only, no prompt', () => {
    expect(matchTrigger('/ask').matched).toBe(false)
    expect(matchTrigger('/ask   ').matched).toBe(false)
  })

  it('truncates and appends notice when over max length', () => {
    const long = 'a'.repeat(DEFAULT_MAX_PROMPT_LENGTH + 100)
    const r = matchTrigger(`/ask ${long}`)
    expect(r.matched).toBe(true)
    if (r.matched) {
      expect(r.prompt.length).toBeLessThanOrEqual(DEFAULT_MAX_PROMPT_LENGTH + 50)
      expect(r.prompt).toContain('truncated')
    }
  })

  it('matches with custom max length', () => {
    const r = matchTrigger('/ask hi', 10)
    expect(r.matched).toBe(true)
    if (r.matched)
      expect(r.prompt).toBe('hi')
  })
})
