import { spawn } from 'node:child_process'
import type { RelayRequest, RelayResponse, StreamChunk, StreamingProvider } from '@agent-relay/core'
import type { CursorAssistantEvent, CursorStreamEvent, CursorToolCallEvent } from './stream-types'

export const CURSOR_CLI_NOT_FOUND = 'CURSOR_CLI_NOT_FOUND'
export const CURSOR_CLI_TIMEOUT = 'CURSOR_CLI_TIMEOUT'
export const CURSOR_CLI_EXIT_ERROR = 'CURSOR_CLI_EXIT_ERROR'

export interface CursorCliProviderConfig {
  /** CLI command (default: "agent") */
  command?: string
  /** Timeout in ms (default: 120_000) */
  timeoutMs?: number
}

function buildArgs(request: RelayRequest): string[] {
  const args = ['-p', request.prompt, '--output-format', 'json', '--trust']
  const opts = request.options
  if (opts?.model)
    args.push('--model', opts.model)
  if (opts?.mode)
    args.push('--mode', opts.mode)
  return args
}

function buildStreamArgs(request: RelayRequest): string[] {
  const args = ['-p', request.prompt, '--output-format', 'stream-json', '--trust']
  const opts = request.options
  if (opts?.model)
    args.push('--model', opts.model)
  if (opts?.mode)
    args.push('--mode', opts.mode)
  return args
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string')
    return content
  if (Array.isArray(content)) {
    return content.map((part: unknown) => {
      if (typeof part === 'object' && part !== null && 'text' in part)
        return String((part as { text: unknown }).text)
      return ''
    }).filter(Boolean).join('')
  }
  if (typeof content === 'object' && content !== null && 'text' in content)
    return String((content as { text: unknown }).text)
  return ''
}

/** Parse one NDJSON line into a StreamChunk or null if not applicable. */
function parseStreamLine(line: string): StreamChunk | null {
  const trimmed = line.trim()
  if (!trimmed)
    return null
  try {
    const obj = JSON.parse(trimmed) as CursorStreamEvent

    if (obj.type === 'assistant') {
      const ev = obj as CursorAssistantEvent
      const o = obj as unknown as Record<string, unknown>
      const content = ev.message?.content ?? o.content ?? o.text ?? o.delta
      const text = extractTextFromContent(content) || (typeof o.delta === 'string' ? o.delta : '')
      if (text)
        return { type: 'text', text }
    }
    const o = obj as unknown as Record<string, unknown>
    if (o.type === 'message' || o.type === 'response') {
      const content = (o.message as Record<string, unknown> | undefined)?.content ?? o.content ?? o.text ?? o.delta
      const text = extractTextFromContent(content) || (typeof o.delta === 'string' ? o.delta : '')
      if (text)
        return { type: 'text', text }
    }
    if (obj.type === 'tool_call') {
      const ev = obj as CursorToolCallEvent
      const name = (o.name ?? o.tool_name ?? ev.subtype) as string | undefined
      const args = o.args ?? o.arguments
      return {
        type: 'tool_call',
        toolCallId: (o.id ?? ev.call_id) as string | undefined,
        name,
        args: args !== undefined ? JSON.stringify(args) : undefined,
      }
    }
  }
  catch {
    // ignore malformed lines
  }
  return null
}

function parseStdout(stdout: string): string {
  const trimmed = stdout.trim()
  if (!trimmed)
    return trimmed
  try {
    const json = JSON.parse(trimmed) as unknown
    if (typeof json === 'object' && json !== null && 'text' in json && typeof (json as { text: unknown }).text === 'string')
      return (json as { text: string }).text
    if (typeof json === 'object' && json !== null && 'result' in json && typeof (json as { result: unknown }).result === 'string')
      return (json as { result: string }).result
    if (typeof json === 'object' && json !== null && 'content' in json && typeof (json as { content: unknown }).content === 'string')
      return (json as { content: string }).content
    return trimmed
  }
  catch {
    return trimmed
  }
}

export function createCursorCliProvider(config: CursorCliProviderConfig = {}): StreamingProvider {
  const command = config.command ?? 'agent'
  const timeoutMs = config.timeoutMs ?? 120_000

  return {
    async execute(request: RelayRequest): Promise<RelayResponse> {
      const args = buildArgs(request)

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
          ...(request.cwd !== undefined && request.cwd !== '' && { cwd: request.cwd }),
        })

        let stdout = ''
        let stderr = ''
        child.stdout?.on('data', (chunk: Buffer) => { stdout += chunk.toString() })
        child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

        const timer = setTimeout(() => {
          child.kill('SIGTERM')
          resolve({
            success: false,
            error: {
              code: CURSOR_CLI_TIMEOUT,
              message: `Cursor CLI did not complete within ${timeoutMs}ms.`,
            },
          })
        }, timeoutMs)

        child.on('error', (err: NodeJS.ErrnoException) => {
          clearTimeout(timer)
          if (err.code === 'ENOENT') {
            resolve({
              success: false,
              error: {
                code: CURSOR_CLI_NOT_FOUND,
                message: 'Cursor CLI not found. Install it: https://cursor.com/docs/cli/overview',
              },
            })
            return
          }
          resolve({
            success: false,
            error: {
              code: CURSOR_CLI_EXIT_ERROR,
              message: err.message ?? String(err),
            },
          })
        })

        child.on('close', (code, signal) => {
          clearTimeout(timer)
          if (code === 0) {
            resolve({
              success: true,
              result: parseStdout(stdout),
            })
            return
          }
          const message = signal
            ? `Process killed (${signal}).`
            : (stderr.trim() || `Exit code ${code ?? 'unknown'}.`)
          resolve({
            success: false,
            error: {
              code: CURSOR_CLI_EXIT_ERROR,
              message,
            },
          })
        })
      })
    },

    async *executeStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined> {
      const args = buildStreamArgs(request)
      const child = spawn(command, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        ...(request.cwd !== undefined && request.cwd !== '' && { cwd: request.cwd }),
      })

      const pendingChunks: StreamChunk[] = []
      let resolveNext: (() => void) | null = null
      const wake = () => {
        const r = resolveNext
        resolveNext = null
        r?.()
      }

      let buffer = ''
      let stderr = ''
      const push = (chunk: Buffer) => {
        buffer += chunk.toString()
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        return lines
      }

      child.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString() })

      child.stdout?.on('data', (chunk: Buffer) => {
        for (const line of push(chunk)) {
          const parsed = parseStreamLine(line)
          if (parsed) {
            pendingChunks.push(parsed)
            wake()
          }
        }
      })

      const waitNext = () => new Promise<void>(resolve => { resolveNext = resolve })

      child.on('error', (err: Error & { code?: string }) => {
        clearTimeout(timer)
        if (err.code === 'ENOENT')
          pendingChunks.push({
            type: 'error',
            error: {
              code: CURSOR_CLI_NOT_FOUND,
              message: 'Cursor CLI not found. Install it: https://cursor.com/docs/cli/overview',
            },
          })
        else
          pendingChunks.push({
            type: 'error',
            error: { code: CURSOR_CLI_EXIT_ERROR, message: err.message ?? String(err) },
          })
        wake()
      })

      const timer = setTimeout(() => {
        child.kill('SIGTERM')
        pendingChunks.push({
          type: 'error',
          error: {
            code: CURSOR_CLI_TIMEOUT,
            message: `Cursor CLI did not complete within ${timeoutMs}ms.`,
          },
        })
        wake()
      }, timeoutMs)

      child.on('close', (code, signal) => {
        clearTimeout(timer)
        if (code !== 0 && pendingChunks.length === 0) {
          const message = signal
            ? `Process killed (${signal}).`
            : (stderr.trim() || `Exit code ${code ?? 'unknown'}.`)
          const truncated = message.length > 1500 ? `${message.slice(0, 1500)}…` : message
          pendingChunks.push({
            type: 'error',
            error: { code: CURSOR_CLI_EXIT_ERROR, message: truncated },
          })
        }
        if (code === 0)
          pendingChunks.push({ type: 'done' })
        wake()
      })

      while (true) {
        while (pendingChunks.length > 0) {
          const chunk = pendingChunks.shift()!
          yield chunk
          if (chunk.type === 'error' || chunk.type === 'done')
            return
        }
        await waitNext()
      }
    },
  }
}
