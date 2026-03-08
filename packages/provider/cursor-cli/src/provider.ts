import type { RelayRequest, RelayResponse, StreamChunk, StreamingProvider } from '@agent-relay/core'
import type { Buffer } from 'node:buffer'
import type { CursorStreamEvent } from './types'
import { spawn } from 'node:child_process'

/** Provider that extends StreamingProvider with create-chat and models. */
export interface CursorCliProvider extends StreamingProvider {
  /** Create a new empty chat; returns its ID (for use with --resume). */
  createChat: (workspace?: string) => Promise<{ chatId: string }>
  /** List available model IDs. */
  listModels: () => Promise<string[]>
}

export const CURSOR_CLI_NOT_FOUND = 'CURSOR_CLI_NOT_FOUND'
export const CURSOR_CLI_TIMEOUT = 'CURSOR_CLI_TIMEOUT'
export const CURSOR_CLI_EXIT_ERROR = 'CURSOR_CLI_EXIT_ERROR'

const CURSOR_CLI_COMMAND = 'agent'

const DEFAULT_CURSOR_MODEL = 'Auto'

/** Default model for CLI (request.options.model overrides). Override with CURSOR_MODEL env. */
function getDefaultCursorModel(): string {
  return process.env.CURSOR_MODEL ?? DEFAULT_CURSOR_MODEL
}

export interface CursorCliProviderConfig {
  /** Timeout in ms (default: 120_000) */
  timeoutMs?: number
}

const STREAM_COMMON_ARGS = ['--force', '--approve-mcps', '--trust']

function getEffectiveModel(opts: RelayRequest['options']): string {
  return opts?.model ?? getDefaultCursorModel()
}

function buildArgs(request: RelayRequest): string[] {
  const workspace = request.workspace ?? process.cwd()
  const args = [
    '-p',
    request.prompt,
    '--output-format',
    'text',
    '--trust',
    '--model',
    getEffectiveModel(request.options),
    '--workspace',
    workspace,
  ]
  const opts = request.options
  if (opts?.mode)
    args.push('--mode', opts.mode)
  return args
}

function buildStreamArgs(request: RelayRequest): string[] {
  const workspace = request.workspace ?? process.cwd()
  const args: string[] = [
    '-p',
    request.prompt,
    '--model',
    getEffectiveModel(request.options),
    '--workspace',
    workspace,
    '--output-format',
    'stream-json',
    ...STREAM_COMMON_ARGS,
  ]
  if (request.sessionId)
    args.push('--resume', request.sessionId)
  const opts = request.options
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

interface RunCliResult {
  stdout: string
  stderr: string
  code: number | null
  /** Set when process failed to start or was killed before exit. */
  errorCode?: 'ENOENT' | 'TIMEOUT'
}

function runCli(
  args: string[],
  options: { timeoutMs: number, cwd: string },
): Promise<RunCliResult> {
  const { timeoutMs, cwd } = options
  return new Promise((resolve) => {
    const child = spawn(CURSOR_CLI_COMMAND, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      cwd,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      resolve({
        stdout,
        stderr,
        code: null,
        errorCode: 'TIMEOUT',
      })
    }, timeoutMs)
    child.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString()
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })
    child.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      if (err.code === 'ENOENT') {
        resolve({
          stdout: '',
          stderr: '',
          code: null,
          errorCode: 'ENOENT',
        })
      }
      else {
        resolve({
          stdout: '',
          stderr: err.message ?? String(err),
          code: null,
        })
      }
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      resolve({
        stdout,
        stderr: signal ? stderr || `killed (${signal})` : stderr,
        code: code ?? null,
      })
    })
  })
}

export function createCursorCliProvider(config: CursorCliProviderConfig = {}): CursorCliProvider {
  const timeoutMs = config.timeoutMs ?? 120_000

  async function executeImpl(request: RelayRequest): Promise<RelayResponse> {
    const args = buildArgs(request)
    const { stdout, stderr, code, errorCode } = await runCli(args, {
      timeoutMs,
      cwd: request.workspace ?? process.cwd(),
    })
    if (errorCode === 'ENOENT') {
      return {
        success: false,
        error: {
          code: CURSOR_CLI_NOT_FOUND,
          message: 'Cursor CLI not found. Install it: https://cursor.com/docs/cli/overview',
        },
      }
    }
    if (errorCode === 'TIMEOUT') {
      return {
        success: false,
        error: {
          code: CURSOR_CLI_TIMEOUT,
          message: `Cursor CLI did not complete within ${timeoutMs}ms.`,
        },
      }
    }
    if (code !== 0) {
      const message = stderr.trim() || `Exit code ${code ?? 'unknown'}.`
      return {
        success: false,
        error: { code: CURSOR_CLI_EXIT_ERROR, message },
      }
    }
    return { success: true, result: stdout }
  }

  return {
    execute: executeImpl,

    async *executeStream(request: RelayRequest): AsyncGenerator<StreamChunk, void, undefined> {
      const args = buildStreamArgs(request)
      const child = spawn(CURSOR_CLI_COMMAND, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        shell: false,
        cwd: request.workspace ?? process.cwd(),
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

      child.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString()
      })

      child.stdout?.on('data', (chunk: Buffer) => {
        for (const line of push(chunk)) {
          const parsed = parseStreamLine(line)
          if (parsed) {
            pendingChunks.push(parsed)
            wake()
          }
        }
      })

      const waitNext = () => new Promise<void>((resolve) => {
        resolveNext = resolve
      })

      child.on('error', (err: Error & { code?: string }) => {
        clearTimeout(timer)
        if (err.code === 'ENOENT') {
          pendingChunks.push({
            type: 'error',
            error: {
              code: CURSOR_CLI_NOT_FOUND,
              message: 'Cursor CLI not found. Install it: https://cursor.com/docs/cli/overview',
            },
          })
        }
        else {
          pendingChunks.push({
            type: 'error',
            error: { code: CURSOR_CLI_EXIT_ERROR, message: err.message ?? String(err) },
          })
        }
        wake()
      })

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

    async createChat(workspace?: string): Promise<{ chatId: string }> {
      const args = ['create-chat', ...(workspace && workspace !== '' ? ['--workspace', workspace] : [])]
      const cwd = (workspace && workspace !== '' ? workspace : process.cwd())
      const { stdout, stderr, code } = await runCli(args, { timeoutMs, cwd })
      const chatId = stdout.trim()
      if (code !== 0 || !chatId) {
        throw new Error(stderr.trim() || `create-chat failed (exit ${code})`)
      }
      return { chatId }
    },

    async listModels(): Promise<string[]> {
      const args = ['models']
      const { stdout, stderr, code } = await runCli(args, { timeoutMs, cwd: process.cwd() })
      if (code !== 0) {
        throw new Error(stderr.trim() || `models failed (exit ${code})`)
      }
      const lines = stdout.split('\n').map(l => l.trim()).filter(Boolean)
      const modelIds: string[] = []
      for (const line of lines) {
        if (line === 'Available models')
          continue
        const id = line.includes(' - ') ? line.slice(0, line.indexOf(' - ')).trim() : line
        if (id)
          modelIds.push(id)
      }
      return modelIds
    },
  }
}
