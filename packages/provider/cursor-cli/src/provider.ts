import { spawn } from 'node:child_process'
import type { RelayRequest, RelayResponse } from '@agent-relay/core'

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
  const args = ['-p', request.prompt, '--output-format', 'json']
  const opts = request.options
  if (opts?.model)
    args.push('--model', opts.model)
  if (opts?.mode)
    args.push('--mode', opts.mode)
  return args
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

export function createCursorCliProvider(config: CursorCliProviderConfig = {}): import('@agent-relay/core').Provider {
  const command = config.command ?? 'agent'
  const timeoutMs = config.timeoutMs ?? 120_000

  return {
    async execute(request: RelayRequest): Promise<RelayResponse> {
      const args = buildArgs(request)

      return new Promise((resolve) => {
        const child = spawn(command, args, {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: false,
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
  }
}
