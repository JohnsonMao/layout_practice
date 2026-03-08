import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const { getSession, setSession, deleteSession, closeDb } = await import('./thread-session-store')

describe('thread-session-store', () => {
  const originalEnv = process.env.THREAD_SESSION_DB_PATH

  beforeEach(() => {
    closeDb()
    process.env.THREAD_SESSION_DB_PATH = join(
      tmpdir(),
      `thread-session-test-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`,
    )
  })

  afterEach(() => {
    closeDb()
    if (originalEnv !== undefined)
      process.env.THREAD_SESSION_DB_PATH = originalEnv
    else
      delete process.env.THREAD_SESSION_DB_PATH
  })

  it('getSession returns null when no session stored', async () => {
    expect(await getSession('thread-1')).toBeNull()
  })

  it('setSession and getSession round-trip', async () => {
    await setSession('thread-1', 'sid-abc', '/path/to/project')
    const s = await getSession('thread-1')
    expect(s).not.toBeNull()
    expect(s!.sessionId).toBe('sid-abc')
    expect(s!.workspace).toBe('/path/to/project')
  })

  it('getSession returns process.cwd() when workspace was not set', async () => {
    await setSession('thread-2', 'sid-xyz')
    const s = await getSession('thread-2')
    expect(s).not.toBeNull()
    expect(s!.sessionId).toBe('sid-xyz')
    expect(s!.workspace).toBe(process.cwd())
  })

  it('setSession overwrites existing row (INSERT OR REPLACE)', async () => {
    await setSession('thread-1', 'sid-old', '/old')
    await setSession('thread-1', 'sid-new', '/new')
    const s = await getSession('thread-1')
    expect(s!.sessionId).toBe('sid-new')
    expect(s!.workspace).toBe('/new')
  })

  it('deleteSession removes the row', async () => {
    await setSession('thread-1', 'sid-1')
    expect(await getSession('thread-1')).not.toBeNull()
    await deleteSession('thread-1')
    expect(await getSession('thread-1')).toBeNull()
  })

  it('deleteSession is no-op when thread has no session', async () => {
    await deleteSession('nonexistent')
    expect(await getSession('nonexistent')).toBeNull()
  })
})
