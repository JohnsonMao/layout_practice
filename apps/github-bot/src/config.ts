import { loadEnvFromRepoRoot } from '@agent-relay/core'

loadEnvFromRepoRoot()

/** Config for webhook server and GitHub/relay. Fail-fast on missing required env (task 6.2). */
export function getConfig(): {
  webhookSecret: string
  port: number
  githubToken: string
  defaultWorkspace: string
  maxPromptLength: number
  /** If set, per-repo rate limit (requests per window). */
  rateLimitPerMin: number | null
  /** If set, only these "owner/repo" can trigger (comma-separated). */
  allowedRepos: string | null
} {
  const webhookSecret = process.env.WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('Missing WEBHOOK_SECRET. Set it in the environment.')
    process.exit(1)
  }
  const githubToken = process.env.GITHUB_TOKEN
  if (!githubToken) {
    console.error('Missing GITHUB_TOKEN. Set it in the environment.')
    process.exit(1)
  }
  const port = Number(process.env.PORT) || 3000
  const defaultWorkspace = process.env.GITHUB_BOT_WORKSPACE ?? process.cwd()
  const maxPromptLength = Number(process.env.GITHUB_BOT_MAX_PROMPT_LENGTH) || 16_000
  const rawRate = process.env.GITHUB_BOT_RATE_LIMIT_PER_MIN
  const rateLimitPerMin = rawRate != null && rawRate !== '' ? Number(rawRate) : null
  const allowedRepos = process.env.GITHUB_BOT_ALLOWED_REPOS ?? null
  return { webhookSecret, port, githubToken, defaultWorkspace, maxPromptLength, rateLimitPerMin, allowedRepos }
}
