import type {
  RelayRequest,
  RelayResponse,
  StreamChunk,
  StreamingProvider,
} from '@agent-relay/core'
/**
 * Provider for Google Gemini API: implements Provider and StreamingProvider.
 * Config via GEMINI_API_KEY, optional GEMINI_MODEL; factory overrides supported.
 */
import { GoogleGenAI } from '@google/genai'
import { type GeminiProviderConfig, resolveConfig } from './config'

const GEMINI_AUTH_ERROR = 'GEMINI_AUTH_ERROR'
const GEMINI_RATE_LIMIT = 'GEMINI_RATE_LIMIT'
const GEMINI_API_ERROR = 'GEMINI_API_ERROR'
const TIMEOUT = 'TIMEOUT'

export function toUserFacingError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message ?? ''
    if (/api key|apiKey|401|unauthorized|invalid.*key/i.test(msg))
      return 'Gemini API key is missing or invalid. Set GEMINI_API_KEY.'
    if (/429|rate limit|quota|resource exhausted/i.test(msg))
      return 'Gemini rate limit or quota exceeded. Try again later.'
    if (/timeout|ETIMEDOUT/i.test(msg))
      return 'Gemini request timed out. Try again later.'
    return msg.slice(0, 200)
  }
  return String(err).slice(0, 200)
}

function mapToRelayError(err: unknown): { code: string, message: string } {
  const msg = toUserFacingError(err)
  if (err instanceof Error) {
    const m = err.message ?? ''
    if (/api key|apiKey|401|unauthorized|invalid.*key/i.test(m))
      return { code: GEMINI_AUTH_ERROR, message: msg }
    if (/429|rate limit|quota|resource exhausted/i.test(m))
      return { code: GEMINI_RATE_LIMIT, message: msg }
    if (/timeout|ETIMEDOUT/i.test(m))
      return { code: TIMEOUT, message: msg }
  }
  return { code: GEMINI_API_ERROR, message: msg }
}

export interface GeminiProvider extends StreamingProvider {
  createChat: (_workspace?: string) => Promise<{ chatId: string }>
}

export function createGeminiProvider(config: GeminiProviderConfig = {}): GeminiProvider {
  const { apiKey, model: defaultModel, timeoutMs } = resolveConfig(config)

  function getClient(): GoogleGenAI {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set. Set the environment variable or pass apiKey in config.')
    }
    return new GoogleGenAI({ apiKey })
  }

  async function execute(request: RelayRequest): Promise<RelayResponse> {
    if (!apiKey) {
      return {
        success: false,
        error: {
          code: GEMINI_AUTH_ERROR,
          message: 'GEMINI_API_KEY is not set. Set the environment variable or pass apiKey in config.',
        },
      }
    }
    try {
      const ai = getClient()
      const model = request.options?.model ?? defaultModel
      const response = await ai.models.generateContent({
        model,
        contents: request.prompt,
      })
      const text = response?.text ?? ''
      return { success: true, result: text }
    }
    catch (err) {
      const relayError = mapToRelayError(err)
      return { success: false, error: relayError }
    }
  }

  async function* executeStreamImpl(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined> {
    if (!apiKey) {
      yield {
        type: 'error',
        error: {
          code: GEMINI_AUTH_ERROR,
          message: 'GEMINI_API_KEY is not set. Set the environment variable or pass apiKey in config.',
        },
      }
      return
    }

    const ai = getClient()
    const model = request.options?.model ?? defaultModel
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
    }, timeoutMs)

    try {
      const stream = await ai.models.generateContentStream({
        model,
        contents: request.prompt,
      })

      for await (const chunk of stream) {
        if (timedOut) {
          yield {
            type: 'error',
            error: { code: TIMEOUT, message: 'Gemini request timed out. Try again later.' },
          }
          return
        }
        const text = (chunk as { text?: string })?.text
        if (typeof text === 'string' && text.length > 0)
          yield { type: 'text', text }
      }
      if (!timedOut)
        yield { type: 'done' }
    }
    catch (err) {
      if (!timedOut) {
        const relayError = mapToRelayError(err)
        yield { type: 'error', error: relayError }
      }
    }
    finally {
      clearTimeout(timeoutId)
    }
  }

  async function createChat(_workspace?: string): Promise<{ chatId: string }> {
    throw new Error('Gemini provider does not support createChat/session. Use execute or executeStream without sessionId.')
  }

  return {
    execute,
    executeStream: executeStreamImpl,
    createChat,
  }
}
