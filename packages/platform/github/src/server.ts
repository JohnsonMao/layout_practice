import { Buffer } from 'node:buffer'
import { createServer } from 'node:http'
import { verifyWebhookSignature } from './verify.js'

const WEBHOOK_PATH = '/webhook'

export interface WebhookServerOptions {
  port: number
  webhookSecret: string
  /** event = X-GitHub-Event header value */
  onPayload: (rawBody: Buffer, parsed: unknown, event: string | undefined) => void | Promise<void>
}

/**
 * Create and return an HTTP server that accepts POST /webhook,
 * verifies X-Hub-Signature-256, and calls onPayload with raw body and parsed JSON.
 * Returns 401 if signature is missing or invalid; 200 after handling (or when no trigger).
 */
export function createWebhookServer(options: WebhookServerOptions): ReturnType<typeof createServer> {
  const { port, webhookSecret, onPayload } = options

  const server = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== WEBHOOK_PATH) {
      res.writeHead(404, { 'Content-Type': 'text/plain' })
      res.end('Not Found')
      return
    }

    const chunks: Buffer[] = []
    for await (const chunk of req)
      chunks.push(chunk as Buffer)
    const rawBody = Buffer.concat(chunks)
    const signatureHeader = req.headers['x-hub-signature-256'] as string | undefined

    if (!verifyWebhookSignature(rawBody, signatureHeader, webhookSecret)) {
      res.writeHead(401, { 'Content-Type': 'text/plain' })
      res.end('Unauthorized')
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(rawBody.toString('utf8'))
    }
    catch {
      res.writeHead(400, { 'Content-Type': 'text/plain' })
      res.end('Bad Request')
      return
    }

    res.writeHead(200, { 'Content-Type': 'text/plain' })
    res.end('OK')

    const event = req.headers['x-github-event'] as string | undefined
    void Promise.resolve(onPayload(rawBody, parsed, event)).catch((err) => {
      console.error('Webhook handler error:', err instanceof Error ? err.message : String(err))
    })
  })

  server.listen(port, () => {
    process.stdout.write(`Webhook server listening on port ${port}\n`)
  })

  return server
}
