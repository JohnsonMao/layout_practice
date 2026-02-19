import { spawn } from 'node:child_process'
import type { RelayRequest, RelayResponse, StreamChunk, StreamingProvider } from '@agent-relay/core'
import type { CursorResultEvent, CursorStreamEvent } from './types'

export const CURSOR_CLI_NOT_FOUND = 'CURSOR_CLI_NOT_FOUND'
export const CURSOR_CLI_TIMEOUT = 'CURSOR_CLI_TIMEOUT'
export const CURSOR_CLI_EXIT_ERROR = 'CURSOR_CLI_EXIT_ERROR'

const CURSOR_CLI_COMMAND = 'agent'

export interface CursorCliProviderConfig {
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
  const args: string[] = []
  if (request.sessionId)
    args.push('--resume', request.sessionId)
  args.push('-p', request.prompt, '--force', '--approve-mcps', '--output-format', 'stream-json', '--trust')
  const opts = request.options
  if (opts?.model)
    args.push('--model', opts.model)
  if (opts?.mode)
    args.push('--mode', opts.mode)
  return args
}

/** Parse one NDJSON line. Returns a single chunk or null. Only type "system" emits system chunk (session_id for storing). */
function parseStreamLine(line: string): StreamChunk | null {
  const trimmed = line.trim()
  if (!trimmed)
    return null
  try {
    const event = JSON.parse(trimmed) as CursorStreamEvent

    switch (event.type) {
      case 'system': {
        const sessionId = event.session_id
        const model = event.model
        if (typeof sessionId === 'string' && sessionId.length > 0)
          return { type: 'system', sessionId, model }
        break
      }
      case 'assistant': {
        const text = event.message?.content?.[0]?.text
        if (text)
          return { type: 'text', text }
        break
      }
      case 'tool_call': {
        const toolCall = event.tool_call
        const toolName = toolCall ? Object.keys(toolCall)[0] : 'tool'
        const payload = toolCall?.[toolName]
        const isCompleted = event.subtype === 'completed'
        const isRejected = isCompleted && payload?.result?.rejected !== undefined
        return {
          type: 'tool_call',
          toolName,
          isCompleted,
          isRejected,
        }
      }
      case 'user':
      case 'result':
      case 'thinking':
        break
      default:
        console.error('[cursor-cli] unhandled event type:', (event as { type: string }).type, trimmed.slice(0, 200))
    }
    return null
  }
  catch {
    // ignore malformed lines
  }
  return null
}

export function createCursorCliProvider(config: CursorCliProviderConfig = {}): StreamingProvider {
  const timeoutMs = config.timeoutMs ?? 120_000

  return {
    async execute(request: RelayRequest): Promise<RelayResponse> {
      const args = buildArgs(request)

      return new Promise((resolve) => {
        const child = spawn(CURSOR_CLI_COMMAND, args, {
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
            const event = JSON.parse(stdout) as CursorResultEvent
            resolve({
              success: true,
              result: event.result ?? '',
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
      const child = spawn(CURSOR_CLI_COMMAND, args, {
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
