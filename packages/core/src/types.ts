/** Optional options passed through to the provider (e.g. model, mode). */
export interface RelayRequestOptions {
  model?: string
  mode?: string
}

/** Canonical request type used by platforms to submit AI tasks. */
export interface RelayRequest {
  prompt: string
  /** Working directory for the agent (e.g. project root). Omit to use process cwd. */
  cwd?: string
  options?: RelayRequestOptions
}

/** Error object in a failed relay response. */
export interface RelayError {
  code: string
  message: string
}

/** Canonical response type returned by the relay to platforms. */
export interface RelayResponseSuccess {
  success: true
  result: string
}

/** Canonical error response. */
export interface RelayResponseError {
  success: false
  error: RelayError
}

export type RelayResponse = RelayResponseSuccess | RelayResponseError

/** Provider interface: accepts relay request, returns relay response. */
export interface Provider {
  execute(request: RelayRequest): Promise<RelayResponse>
}

/** Stream chunk: incremental text or tool call for approval. */
export type StreamChunk =
  | { type: 'text'; text: string }
  | { type: 'tool_call'; toolCallId?: string; name?: string; args?: string }
  | { type: 'done' }
  | { type: 'error'; error: RelayError }

/** Optional streaming: provider may implement to support runStream. */
export interface StreamingProvider extends Provider {
  executeStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined>
}
