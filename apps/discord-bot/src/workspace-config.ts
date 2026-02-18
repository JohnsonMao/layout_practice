const PREFIX = 'WORKSPACE_'

/**
 * Load workspace id -> absolute path from env.
 * - WORKSPACE_DEFAULT (optional): default workspace path; if unset, uses process.cwd()
 * - WORKSPACE_<NAME>: additional workspaces (NAME lowercased, underscores → hyphens as id)
 */
function loadWorkspaces(): Record<string, string> {
  const map: Record<string, string> = {}
  const cwd = process.cwd()

  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith(PREFIX) || value === undefined || value === '')
      continue
    const id = key.slice(PREFIX.length).toLowerCase().replace(/_/g, '-')
    map[id] = value
  }

  if (!('default' in map))
    map.default = cwd

  return map
}

let cache: Record<string, string> | null = null

export function getWorkspaces(): Record<string, string> {
  if (cache === null)
    cache = loadWorkspaces()
  return cache
}

/** Resolve workspace id to absolute path. Returns undefined if id not found. */
export function getWorkspacePath(workspaceId: string): string | undefined {
  return getWorkspaces()[workspaceId]
}

/** Ids suitable for Discord slash command choices (default first). */
export function getWorkspaceChoiceIds(): string[] {
  const ws = getWorkspaces()
  const ids = Object.keys(ws)
  if (ids.length <= 1)
    return ids
  const rest = ids.filter(id => id !== 'default')
  return ['default', ...rest].filter(id => id in ws)
}
