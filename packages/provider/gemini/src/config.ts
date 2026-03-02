/**
 * Config for the Gemini provider: API key, model, and timeout.
 * Values can come from env (GEMINI_API_KEY, GEMINI_MODEL) or from overrides.
 */
export interface GeminiProviderConfig {
  /** Override API key (default: process.env.GEMINI_API_KEY) */
  apiKey?: string
  /** Override default model (default: process.env.GEMINI_MODEL or 'gemini-2.0-flash') */
  model?: string
  /** Timeout for stream/execute in ms (default: 300_000) */
  timeoutMs?: number
}

const DEFAULT_MODEL = 'gemini-2.0-flash'
const DEFAULT_TIMEOUT_MS = 300_000

export function getApiKeyFromEnv(): string | undefined {
  return process.env.GEMINI_API_KEY ?? undefined
}

export function getDefaultModelFromEnv(): string {
  return process.env.GEMINI_MODEL ?? DEFAULT_MODEL
}

export function resolveConfig(config: GeminiProviderConfig = {}): {
  apiKey: string
  model: string
  timeoutMs: number
} {
  const apiKey = config.apiKey ?? getApiKeyFromEnv()
  const model = config.model ?? getDefaultModelFromEnv()
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  return { apiKey: apiKey ?? '', model, timeoutMs }
}
