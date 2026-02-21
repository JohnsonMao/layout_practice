/**
 * Provider for GitHub Copilot SDK: implements StreamingProvider + createChat.
 * Requires Copilot CLI installed. Auth and model are read from env (getGithubTokenFromEnv / getDefaultModelFromEnv).
 */
import { CopilotClient } from '@github/copilot-sdk'
import type {
  RelayRequest,
  RelayResponse,
  RelayResponseError,
  StreamChunk,
  StreamingProvider,
} from '@agent-relay/core'

const DEFAULT_MODEL = 'gpt-5'
const STREAM_TIMEOUT_MS = 300_000

export type CopilotProviderConfig = {
  timeoutMs?: number
}

function getGithubTokenFromEnv(): string | undefined {
  return (
    process.env.COPILOT_GITHUB_TOKEN
    ?? process.env.GH_TOKEN
    ?? process.env.GITHUB_TOKEN
    ?? undefined
  )
}

/** Default model for createSession. Override with COPILOT_DEFAULT_MODEL. */
function getDefaultModelFromEnv(): string {
  return process.env.COPILOT_DEFAULT_MODEL ?? DEFAULT_MODEL
}

/** Provider that extends StreamingProvider with createChat (session id for resume). */
export interface CopilotProvider extends StreamingProvider {
  createChat(workspace?: string): Promise<{ chatId: string }>
}

/**
 * User-facing error message for Copilot/CLI failures (no stack or internal details).
 */
export function toUserFacingError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message ?? ''
    if (/not found|ENOENT|spawn|copilot.*cli/i.test(msg))
      return 'Copilot CLI is not installed or could not start. Install and configure Copilot CLI.'
    if (/auth|token|unauthorized|401/i.test(msg))
      return 'Copilot auth failed. Check COPILOT_GITHUB_TOKEN or GH_TOKEN.'
    if (/timeout|ETIMEDOUT/i.test(msg))
      return 'Copilot request timed out. Try again later.'
    return msg.slice(0, 200)
  }
  return String(err).slice(0, 200)
}

export function createCopilotProvider(config: CopilotProviderConfig = {}): CopilotProvider {
  const timeoutMs = config.timeoutMs ?? STREAM_TIMEOUT_MS
  let client: CopilotClient | null = null

  function getOrCreateClient(): CopilotClient {
    if (client)
      return client
    const token = getGithubTokenFromEnv()
    client = new CopilotClient({
      ...(token && { githubToken: token }),
      useLoggedInUser: !token,
      autoStart: true,
      autoRestart: true,
    })
    return client
  }

  async function ensureStarted(): Promise<CopilotClient> {
    const c = getOrCreateClient()
    await c.start()
    return c
  }

  async function* executeStreamImpl(
    request: RelayRequest,
  ): AsyncGenerator<StreamChunk, void, undefined> {
    const client = await ensureStarted()
    const sessionId = request.sessionId
    if (!sessionId) {
      yield {
        type: 'error',
        error: {
          code: 'COPILOT_MISSING_SESSION',
          message: 'Copilot stream requires sessionId (create a chat first).',
        },
      }
      return
    }

    yield { type: 'system', sessionId, model: request.options?.model }

    let session
    try {
      session = await client.resumeSession(sessionId)
    }
    catch (err) {
      yield {
        type: 'error',
        error: { code: 'COPILOT_RESUME_ERROR', message: toUserFacingError(err) },
      }
      return
    }

    const chunks: StreamChunk[] = []
    let resolveNext: () => void = () => {}
    let nextPromise = new Promise<void>(r => { resolveNext = r })
    let ended = false

    const push = (chunk: StreamChunk): void => {
      if (ended)
        return
      chunks.push(chunk)
      resolveNext()
    }

    const finish = (): void => {
      if (ended)
        return
      ended = true
      resolveNext()
    }

    const unsubIdle = session.on('session.idle', () => {
      push({ type: 'done' })
      finish()
    })

    session.on('assistant.message_delta', (event: { data?: { deltaContent?: string } }) => {
      const text = event.data?.deltaContent
      if (text)
        push({ type: 'text', text })
    })

    session.on('assistant.message', (event: { data?: { content?: string } }) => {
      const text = event.data?.content
      if (text)
        push({ type: 'text', text })
    })

    session.on('tool.execution_start', (event: { data?: { toolName?: string } }) => {
      push({ type: 'tool_call', toolName: event.data?.toolName ?? 'tool', isCompleted: false })
    })

    session.on('tool.execution_complete', (event: { data?: { success?: boolean } }) => {
      const isRejected = event.data?.success === false
      push({ type: 'tool_call', toolName: 'tool', isCompleted: true, isRejected })
    })

    session.on('session.error', (event: { data?: { message?: string } }) => {
      push({
        type: 'error',
        error: { code: 'COPILOT_ERROR', message: event.data?.message ?? 'Copilot error.' },
      })
      finish()
    })

    const timeoutId = setTimeout(() => {
      if (ended)
        return
      push({
        type: 'error',
        error: { code: 'TIMEOUT', message: 'Copilot request timed out. Try again later.' },
      })
      finish()
    }, timeoutMs)

    try {
      await session.send({ prompt: request.prompt })
    }
    catch (err) {
      clearTimeout(timeoutId)
      unsubIdle()
      yield {
        type: 'error',
        error: {
          code: 'COPILOT_SEND_ERROR',
          message: toUserFacingError(err),
        },
      }
      return
    }

    while (!ended || chunks.length > 0) {
      await nextPromise
      nextPromise = new Promise<void>(r => { resolveNext = r })
      while (chunks.length > 0) {
        const chunk = chunks.shift()!
        if (chunk.type === 'done') {
          clearTimeout(timeoutId)
          unsubIdle()
          yield chunk
          return
        }
        if (chunk.type === 'error') {
          clearTimeout(timeoutId)
          unsubIdle()
          yield chunk
          return
        }
        yield chunk
      }
    }

    clearTimeout(timeoutId)
    unsubIdle()
    yield { type: 'done' }
  }

  async function execute(request: RelayRequest): Promise<RelayResponse> {
    let result = ''
    let lastError: RelayResponseError | null = null
    for await (const chunk of executeStreamImpl(request)) {
      if (chunk.type === 'text')
        result += chunk.text
      if (chunk.type === 'error')
        lastError = { success: false, error: chunk.error }
      if (chunk.type === 'done')
        return lastError ?? { success: true, result }
    }
    return lastError ?? { success: true, result }
  }

  async function createChat(_workspace?: string): Promise<{ chatId: string }> {
    const client = await ensureStarted()
    const model = getDefaultModelFromEnv()
    const session = await client.createSession({
      model,
      streaming: true,
    })
    return { chatId: session.sessionId }
  }

  return {
    execute,
    executeStream: executeStreamImpl,
    createChat,
  }
}
