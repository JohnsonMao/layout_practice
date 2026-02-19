import type {
  Provider,
  RelayRequest,
  RelayResponse,
  StreamChunk,
  StreamingProvider,
} from './types'

const PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE'

function isStreamingProvider(p: Provider): p is StreamingProvider {
  return typeof (p as StreamingProvider).executeStream === 'function'
}

function createRunStream(provider: Provider | null) {
  return async function* runStreamImpl(
    request: RelayRequest,
  ): AsyncGenerator<StreamChunk, void, undefined> {
    if (!provider) {
      yield {
        type: 'error',
        error: { code: PROVIDER_UNAVAILABLE, message: 'No provider configured.' },
      }
      return
    }

    if (isStreamingProvider(provider)) {
      yield* provider.executeStream(request)
      return
    }

    try {
      const response: RelayResponse = await provider.execute(request)
      if (response.success) {
        if (response.result)
          yield { type: 'text', text: response.result }
        yield { type: 'done' }
      }
      else {
        yield { type: 'error', error: response.error }
      }
    }
    catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      yield {
        type: 'error',
        error: { code: PROVIDER_UNAVAILABLE, message },
      }
    }
  }
}

export interface RelayConfig {
  provider: Provider
}

export interface Relay {
  runStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined>
}

/**
 * Creates a relay that streams provider response. Uses executeStream when available,
 * otherwise falls back to execute() and yields text + done.
 */
export function createRelay(config: RelayConfig): Relay {
  const { provider } = config
  return {
    runStream: createRunStream(provider),
  }
}
