import crypto from 'node:crypto'

const SIGNATURE_PREFIX = 'sha256='

/**
 * Verify GitHub webhook signature using HMAC-SHA256.
 * Uses constant-time comparison to prevent timing attacks.
 * @param rawBody - Raw request body (must not be parsed yet)
 * @param signatureHeader - Value of X-Hub-Signature-256 header
 * @param secret - Webhook secret from config
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX))
    return false
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex')
  const received = signatureHeader.slice(SIGNATURE_PREFIX.length)
  if (expected.length !== received.length)
    return false
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))
  }
  catch {
    return false
  }
}
