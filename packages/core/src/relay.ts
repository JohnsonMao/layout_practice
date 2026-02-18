import type { Provider, RelayRequest, RelayResponse, StreamChunk } from './types'
import { createRunStream } from './relay-stream'

const PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE'

export interface RelayConfig {
  provider: Provider
}

export interface Relay {
  run(request: RelayRequest): Promise<RelayResponse>
  runStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined>
}

/**
 * Creates a relay that accepts a request, calls the configured provider once,
 * and returns the provider response. Returns error if provider is not configured.
 */
export function createRelay(config: RelayConfig): Relay {
  const { provider } = config
  const runStream = createRunStream(provider)

  const run = async (request: RelayRequest): Promise<RelayResponse> => {
    if (!provider) {
      return {
        success: false,
        error: { code: PROVIDER_UNAVAILABLE, message: 'No provider configured.' },
      }
    }

    try {
      return await provider.execute(request)
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        success: false,
        error: { code: PROVIDER_UNAVAILABLE, message },
      }
    }
  }

  return {
    run,
    runStream,
  }
}
