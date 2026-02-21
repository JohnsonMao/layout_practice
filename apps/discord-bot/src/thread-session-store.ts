import type { Database, SqlJsStatic } from 'sql.js'
import initSqlJs from 'sql.js'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'
import type { RelayProviderType } from '@agent-relay/relay-context'

const DEFAULT_DB_PATH = 'data/thread_sessions.sqlite'

let SQL: SqlJsStatic | null = null
let db: Database | null = null

function getDbPath(): string {
  return process.env.THREAD_SESSION_DB_PATH ?? DEFAULT_DB_PATH
}

async function ensureDb(): Promise<Database> {
  if (db)
    return db
  if (!SQL)
    SQL = await initSqlJs()
  const path = getDbPath()
  const dir = dirname(path)
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
  const data = existsSync(path) ? new Uint8Array(readFileSync(path)) : undefined
  db = new SQL.Database(data)
  db.run(`
    CREATE TABLE IF NOT EXISTS thread_sessions (
      thread_id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      workspace TEXT,
      model TEXT,
      provider TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `)
  return db
}

function persistDb(): void {
  if (!db)
    return
  const path = getDbPath()
  const data = db.export()
  writeFileSync(path, Buffer.from(data))
}

export type ThreadSession = {
  sessionId: string
  workspace: string
  model?: string
  provider?: RelayProviderType
}

export async function getSession(threadId: string): Promise<ThreadSession | null> {
  const database = await ensureDb()
  const stmt = database.prepare(
    'SELECT session_id AS sessionId, workspace, model, provider FROM thread_sessions WHERE thread_id = ?',
  )
  stmt.bind([threadId])
  const row = stmt.step()
    ? (stmt.getAsObject() as {
        sessionId: string
        workspace: string | null
        model: string | null
        provider: string | null
      })
    : null
  stmt.free()
  if (!row)
    return null
  const provider: RelayProviderType =
    row.provider === 'copilot-sdk' ? 'copilot-sdk' : 'cursor-cli'
  return {
    sessionId: row.sessionId,
    workspace: row.workspace ?? process.cwd(),
    ...(row.model != null && row.model !== '' && { model: row.model }),
    provider,
  }
}

export async function setSession(
  threadId: string,
  sessionId: string,
  workspace?: string,
  model?: string,
  provider?: RelayProviderType,
): Promise<void> {
  const database = await ensureDb()
  database.run(
    'INSERT OR REPLACE INTO thread_sessions (thread_id, session_id, workspace, model, provider, created_at) VALUES (?, ?, ?, ?, ?, unixepoch())',
    [threadId, sessionId, workspace ?? null, model ?? null, provider ?? null],
  )
  persistDb()
}

export async function deleteSession(threadId: string): Promise<void> {
  const database = await ensureDb()
  database.run('DELETE FROM thread_sessions WHERE thread_id = ?', [threadId])
  persistDb()
}

/** Close the DB connection (for tests). After this, the next get/set/delete will reopen. */
export function closeDb(): void {
  if (db) {
    db.close()
    db = null
  }
}
