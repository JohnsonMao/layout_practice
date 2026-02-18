/**
 * Cursor CLI stream-json 輸出事件型別（NDJSON 每行一筆）。
 * 依實際 agent 輸出定義，供 parseStreamLine 與後續擴充使用。
 */

/** 訊息內容區塊：多為 { type: "text", text: string } */
export interface CursorContentPart {
  type?: string
  text?: string
}

/** message 欄位：role + content 陣列 */
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

/** type: "assistant" — 主要回覆內容在 message.content */
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
  tool_call?: Record<string, unknown>
  session_id?: string
  timestamp_ms?: number
}

/** type: "result", subtype: "success" — 結尾摘要，含完整 result 文字 */
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
