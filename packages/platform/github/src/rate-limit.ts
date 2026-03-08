/**
 * In-memory per-key rate limit (e.g. per repo or per user).
 * When enabled, check() returns false if over limit; record() must be called after a successful relay trigger.
 */
export function createRateLimiter(options: { windowMs?: number, maxPerWindow?: number } = {}) {
  const windowMs = options.windowMs ?? 60_000
  const maxPerWindow = options.maxPerWindow ?? 5
  const timestampsByKey = new Map<string, number[]>()

  function prune(key: string): void {
    const list = timestampsByKey.get(key)
    if (!list)
      return
    const cutoff = Date.now() - windowMs
    const kept = list.filter(ts => ts > cutoff)
    if (kept.length === 0)
      timestampsByKey.delete(key)
    else timestampsByKey.set(key, kept)
  }

  return {
    check(key: string): boolean {
      prune(key)
      const list = timestampsByKey.get(key) ?? []
      return list.length < maxPerWindow
    },
    record(key: string): void {
      const list = timestampsByKey.get(key) ?? []
      list.push(Date.now())
      timestampsByKey.set(key, list)
    },
  }
}

/** Parse comma-separated "owner/repo" list; empty or unset = allow all. */
export function parseAllowlist(envValue: string | undefined): Set<string> | null {
  if (envValue == null || envValue.trim() === '')
    return null
  const set = new Set<string>()
  for (const s of envValue.split(',')) {
    const t = s.trim()
    if (t)
      set.add(t)
  }
  return set.size > 0 ? set : null
}

/** Return true if repo is allowed (allowlist null = all allowed). */
export function isRepoAllowed(owner: string, repo: string, allowlist: Set<string> | null): boolean {
  if (allowlist == null)
    return true
  return allowlist.has(`${owner}/${repo}`)
}
