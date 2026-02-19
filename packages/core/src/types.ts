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
  /** Cursor session id for resume (e.g. from Cursor CLI stream). When set, provider may use --resume. */
  sessionId?: string
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

/** Incremental assistant text. */
export interface TextStreamChunk {
  type: 'text'
  text: string
}

/** Tool call payload: tool name and completion/rejection flags; consumer assembles display text. */
export interface ToolCallStreamChunk {
  type: 'tool_call'
  toolName?: string
  isCompleted?: boolean
  isRejected?: boolean
}

/** System event, e.g. session_id for storing. */
export interface SystemStreamChunk {
  type: 'system'
  sessionId: string
  model?: string
}

/** Stream ended successfully. */
export interface DoneStreamChunk {
  type: 'done'
}

/** Stream ended with error. */
export interface ErrorStreamChunk {
  type: 'error'
  error: RelayError
}

export type StreamChunk =
  | TextStreamChunk
  | ToolCallStreamChunk
  | SystemStreamChunk
  | DoneStreamChunk
  | ErrorStreamChunk

/** Optional streaming: provider may implement to support runStream. */
export interface StreamingProvider extends Provider {
  executeStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined>
}
