/** Optional options passed through to the provider (e.g. model, mode). */
export interface RelayRequestOptions {
  model?: string
  mode?: string
}

/** Canonical request type used by platforms to submit AI tasks. */
export interface RelayRequest {
  prompt: string
  /** Workspace path for the agent; passed as --workspace to CLI and used as spawn cwd. Defaults to process.cwd(). */
  workspace?: string
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
  execute: (request: RelayRequest) => Promise<RelayResponse>
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
  executeStream: (request: RelayRequest) => AsyncGenerator<StreamChunk, void, undefined>
}

/**
 * Common interface for all platform integrations (Discord, GitHub, Slack, etc.).
 * The unified relay-service uses this to manage the lifecycle of enabled platforms.
 */
export interface Platform {
  /**
   * Platform name (e.g., 'discord', 'github').
   */
  readonly name: string

  /**
   * Initialize the platform (e.g., read config, setup clients).
   * Should throw if required configuration is missing.
   * Receives the orchestration context via Dependency Injection.
   */
  init: (ctx: RelayContext) => Promise<void>

  /**
   * Start listening for events.
   */
  start: () => Promise<void>

  /**
   * Stop the platform and cleanup resources.
   */
  stop: () => Promise<void>
}

/** Provider identifiers. */
export const RELAY_PROVIDER_OPTIONS = ['cursor-cli', 'copilot-sdk', 'gemini'] as const
export type RelayProviderType = (typeof RELAY_PROVIDER_OPTIONS)[number]

/** Session metadata related to provider selection. */
export interface SessionWithProvider {
  provider?: RelayProviderType
}

/** Interface for creating a new chat session. */
export interface CreateChatProvider {
  createChat: (workspace?: string) => Promise<{ chatId: string }>
}

/** Orchestration context for relay services. */
export interface RelayContext {
  /** Display name of the active provider for UI (e.g. "Using Copilot"). */
  activeProviderDisplayName: string
  /** Active provider kind. */
  activeProviderKind: RelayProviderType
  /** Provider for creating new chats. */
  activeCreateChatProvider: CreateChatProvider
  /** Format errors from the active provider into user-facing messages. */
  formatCreateChatError: (err: unknown) => string
  /** Return the Relay for the session's provider; null if that provider is not enabled. */
  getRelayForSession: (session: SessionWithProvider) => import('./relay').Relay | null
  /** User-facing message when getRelayForSession(session) is null. */
  getRunStreamUnavailableMessage: (session: SessionWithProvider) => string
}
