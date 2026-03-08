import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { verifyWebhookSignature } from './verify.js'

function sign(secret: string, body: Buffer): string {
  const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex')
  return `sha256=${hmac}`
}

describe('verifyWebhookSignature', () => {
  it('returns true when signature matches payload and secret', () => {
    const secret = 'my-secret'
    const body = Buffer.from('{"action":"opened"}', 'utf8')
    const sig = sign(secret, body)
    expect(verifyWebhookSignature(body, sig, secret)).toBe(true)
  })

  it('returns false when signature header is missing', () => {
    const body = Buffer.from('{}', 'utf8')
    expect(verifyWebhookSignature(body, undefined, 'secret')).toBe(false)
  })

  it('returns false when signature does not start with sha256=', () => {
    const body = Buffer.from('{}', 'utf8')
    expect(verifyWebhookSignature(body, 'invalid', 'secret')).toBe(false)
  })

  it('returns false when signature hex does not match', () => {
    const body = Buffer.from('{}', 'utf8')
    expect(verifyWebhookSignature(body, 'sha256=deadbeef', 'secret')).toBe(false)
  })

  it('returns false when secret is wrong', () => {
    const body = Buffer.from('{}', 'utf8')
    const sig = sign('right-secret', body)
    expect(verifyWebhookSignature(body, sig, 'wrong-secret')).toBe(false)
  })
})
