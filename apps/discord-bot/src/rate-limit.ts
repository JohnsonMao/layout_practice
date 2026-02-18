/** In-memory per-user rate limit. Default: 5 requests per 60 seconds. */
export function createRateLimiter(options: { windowMs?: number; maxPerWindow?: number } = {}) {
  const windowMs = options.windowMs ?? 60_000
  const maxPerWindow = options.maxPerWindow ?? 5
  const timestampsByUser = new Map<string, number[]>()

  function prune(userId: string): void {
    const list = timestampsByUser.get(userId)
    if (!list)
      return
    const cutoff = Date.now() - windowMs
    const kept = list.filter(ts => ts > cutoff)
    if (kept.length === 0)
      timestampsByUser.delete(userId)
    else
      timestampsByUser.set(userId, kept)
  }

  return {
    /** Returns true if request is allowed, false if over limit. */
    check(userId: string): boolean {
      prune(userId)
      const list = timestampsByUser.get(userId) ?? []
      return list.length < maxPerWindow
    },
    /** Record a request. Call after check() returns true. */
    record(userId: string): void {
      const list = timestampsByUser.get(userId) ?? []
      list.push(Date.now())
      timestampsByUser.set(userId, list)
    },
  }
}
