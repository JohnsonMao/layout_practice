export type ThreadMessage = { role: 'user' | 'assistant'; content: string }

type ThreadState = {
  history: ThreadMessage[]
  cwd: string
}

/** In-memory store: thread id -> history + cwd. Each thread is one workspace. */
const store = new Map<string, ThreadState>()

export function getThreadHistory(threadId: string): ThreadMessage[] {
  return store.get(threadId)?.history ?? []
}

export function appendThreadMessage(threadId: string, role: 'user' | 'assistant', content: string): void {
  const state = store.get(threadId)
  if (!state)
    return
  state.history.push({ role, content })
}

/** Get the working directory for this thread (project path). Defaults to process.cwd() if not set. */
export function getThreadCwd(threadId: string): string {
  return store.get(threadId)?.cwd ?? process.cwd()
}

/** Register a new thread with the given working directory. */
export function registerThread(threadId: string, cwd: string = process.cwd()): void {
  if (!store.has(threadId))
    store.set(threadId, { history: [], cwd })
}

/** Build a single prompt string from history + new user message for the relay. */
export function buildPromptFromHistory(history: ThreadMessage[], newUserContent: string): string {
  if (history.length === 0)
    return newUserContent
  const lines: string[] = ['Previous conversation:']
  for (const m of history) {
    const label = m.role === 'user' ? 'User' : 'Assistant'
    lines.push(`${label}: ${m.content}`)
  }
  lines.push('', 'User:', newUserContent)
  return lines.join('\n')
}
