import type { RelayContext, RelayRequest, StreamChunk } from '@agent-relay/core'

export type RelayOutcome =
  | { success: true, result: string }
  | { success: false, userMessage: string }

/**
 * Run relay with the provided context.
 * Consumes runStream and collects text; on error returns user-facing message without internal details.
 */
export async function runRelay(prompt: string, ctx: RelayContext, workspace?: string): Promise<RelayOutcome> {
  const relay = await ctx.getRelayForSession({})
  if (!relay) {
    return { success: false, userMessage: ctx.getRunStreamUnavailableMessage({}) }
  }

  const request: RelayRequest = { prompt, workspace }
  const chunks: string[] = []
  let errorMessage: string | null = null

  try {
    for await (const chunk of relay.runStream(request)) {
      const c = chunk as StreamChunk
      if (c.type === 'text' && c.text)
        chunks.push(c.text)
      if (c.type === 'error') {
        errorMessage = c.error.message
        break
      }
    }
  }
  catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, userMessage: msg }
  }

  if (errorMessage != null)
    return { success: false, userMessage: errorMessage }
  return { success: true, result: chunks.join('') }
}
