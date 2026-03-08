/**
 * Cursor CLI stream-json event types (one NDJSON line per event).
 * Defined from actual agent output; used by parseStreamLine and extensions.
 */

/** Message content part: usually { type: "text", text: string }. */
export interface CursorContentPart {
  type?: string
  text?: string
}

/** message field: role + content array. */
export interface CursorMessage {
  role?: string
  content?: CursorContentPart[]
}

/** type: "system" */
export interface CursorSystemEvent {
  type: 'system'
  subtype?: string
  apiKeySource?: string
  cwd?: string
  session_id?: string
  model?: string
  permissionMode?: string
}

/** type: "user" */
export interface CursorUserEvent {
  type: 'user'
  message?: CursorMessage
  session_id?: string
}

/** type: "thinking", subtype: "delta" | "completed" */
export interface CursorThinkingEvent {
  type: 'thinking'
  subtype?: 'delta' | 'completed'
  text?: string
  session_id?: string
  timestamp_ms?: number
}

/** type: "assistant" — main reply content in message.content */
export interface CursorAssistantEvent {
  type: 'assistant'
  message?: CursorMessage
  session_id?: string
  model_call_id?: string
  timestamp_ms?: number
}

/** type: "tool_call", subtype: "started" | "completed" */
export interface CursorToolCallEvent {
  type: 'tool_call'
  subtype?: 'started' | 'completed'
  call_id?: string
  tool_call?: CursorToolCallMap
  session_id?: string
  timestamp_ms?: number
}

/** Per-tool payload in tool_call: started has args, completed has result. Shared shape for all MCP tools. */
export interface CursorToolCallPayload {
  args?: Record<string, unknown>
  result?: { success?: unknown, rejected?: unknown }
}

export interface CursorToolCallMap {
  [key: string]: CursorToolCallPayload
}

/** type: "result", subtype: "success" — final summary with full result text */
export interface CursorResultEvent {
  type: 'result'
  subtype?: 'success'
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  result?: string
  session_id?: string
  request_id?: string
}

export type CursorStreamEvent =
  | CursorSystemEvent
  | CursorUserEvent
  | CursorThinkingEvent
  | CursorAssistantEvent
  | CursorToolCallEvent
  | CursorResultEvent
