import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCursorCliProvider } from './provider'

const mockSpawn = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

describe('createCursorCliProvider', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
  })

  it('implements Provider: execute returns Promise<RelayResponse>', async () => {
    mockSpawn.mockImplementation((cmd: string, args: string[]) => {
      const child = {
        stdout: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('{"text":"hi"}')) }) },
        stderr: { on: vi.fn() },
        on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(0), 0) }),
        kill: vi.fn(),
      }
      return child
    })

    const provider = createCursorCliProvider({ command: 'agent', timeoutMs: 5000 })
    const result = await provider.execute({ prompt: 'hello' })

    expect(result).toHaveProperty('success')
    expect(typeof result.success).toBe('boolean')
    if (result.success)
      expect(typeof result.result).toBe('string')
    else
      expect(result.error).toHaveProperty('code', 'message')
  })

  it('invokes CLI with -p and --output-format json', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('{"text":"ok"}')) }) },
      stderr: { on: vi.fn() },
      on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(0), 0) }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'agent' })
    await provider.execute({ prompt: 'test prompt' })

    expect(mockSpawn).toHaveBeenCalledWith('agent', ['-p', 'test prompt', '--output-format', 'json'], expect.objectContaining({ stdio: ['ignore', 'pipe', 'pipe'], shell: false }))
  })

  it('passes optional model and mode to CLI', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('{}')) }) },
      stderr: { on: vi.fn() },
      on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(0), 0) }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'agent' })
    await provider.execute({
      prompt: 'x',
      options: { model: 'gpt-5.2', mode: 'plan' },
    })

    expect(mockSpawn).toHaveBeenCalledWith('agent', [
      '-p', 'x', '--output-format', 'json',
      '--model', 'gpt-5.2', '--mode', 'plan',
    ], expect.any(Object))
  })

  it('returns success with parsed JSON text as result', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('{"text":"parsed result"}')) }) },
      stderr: { on: vi.fn() },
      on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(0), 0) }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'agent' })
    const result = await provider.execute({ prompt: 'q' })

    expect(result.success).toBe(true)
    if (result.success)
      expect(result.result).toBe('parsed result')
  })

  it('fallback to raw stdout when JSON invalid', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('plain text output')) }) },
      stderr: { on: vi.fn() },
      on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(0), 0) }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'agent' })
    const result = await provider.execute({ prompt: 'q' })

    expect(result.success).toBe(true)
    if (result.success)
      expect(result.result).toBe('plain text output')
  })

  it('returns error on non-zero exit with stderr', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn((_, fn: (b: Buffer) => void) => { fn(Buffer.from('error message')) }) },
      on: vi.fn((ev: string, fn: (code: number) => void) => { if (ev === 'close') setTimeout(() => fn(1), 0) }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'agent' })
    const result = await provider.execute({ prompt: 'q' })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.code).toBe('CURSOR_CLI_EXIT_ERROR')
      expect(result.error.message).toContain('error message')
    }
  })

  it('returns CURSOR_CLI_NOT_FOUND when spawn ENOENT', async () => {
    mockSpawn.mockImplementation(() => ({
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn((ev: string, fn: (err: Error) => void) => {
        if (ev === 'error') {
          const err = new Error('not found') as Error & { code: string }
          err.code = 'ENOENT'
          setTimeout(() => fn(err), 0)
        }
      }),
      kill: vi.fn(),
    }))

    const provider = createCursorCliProvider({ command: 'nonexistent' })
    const result = await provider.execute({ prompt: 'q' })

    expect(result.success).toBe(false)
    if (!result.success)
      expect(result.error.code).toBe('CURSOR_CLI_NOT_FOUND')
  })
})
