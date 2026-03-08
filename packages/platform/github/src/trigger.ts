/** Default max characters for prompt extracted from comment body (configurable). */
export const DEFAULT_MAX_PROMPT_LENGTH = 16_000

/**
 * Trigger rule: comment must start with one of the prefixes (case-insensitive trim).
 * Extracted prompt is the rest of the line or full body after the prefix.
 */
const TRIGGER_PREFIXES = ['/ask', '@bot', '!ask']

function normalizePrefix(s: string): string {
  return s.trim().toLowerCase()
}

/**
 * Check if body matches trigger rule and extract prompt.
 * Returns { matched: true, prompt } or { matched: false }.
 * Prompt is trimmed and length-limited (truncate with notice if over maxLength).
 */
export function matchTrigger(
  body: string,
  maxLength: number = DEFAULT_MAX_PROMPT_LENGTH,
): { matched: true, prompt: string } | { matched: false } {
  const trimmed = body.trim()
  const lower = trimmed.toLowerCase()
  for (const prefix of TRIGGER_PREFIXES) {
    const p = normalizePrefix(prefix)
    if (lower.startsWith(p)) {
      const after = trimmed.slice(p.length).trim()
      if (after.length === 0)
        return { matched: false }
      if (after.length > maxLength) {
        return {
          matched: true,
          prompt: `${after.slice(0, maxLength)}\n\n[Input truncated due to length limit.]`,
        }
      }
      return { matched: true, prompt: after }
    }
  }
  return { matched: false }
}
