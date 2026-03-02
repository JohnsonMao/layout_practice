import { createWebhookServer } from './server.js'
import { getConfig } from './config.js'
import { parseWebhookPayload } from './payload.js'
import { matchTrigger } from './trigger.js'
import { runRelay } from './relay.js'
import { createOctokit, postComment } from './github.js'
import { createRateLimiter, parseAllowlist, isRepoAllowed } from './rate-limit.js'

const RATE_LIMIT_MESSAGE = '請求過於頻繁，請稍後再試'

async function main(): Promise<void> {
  const {
    webhookSecret,
    port,
    githubToken,
    defaultWorkspace,
    maxPromptLength,
    rateLimitPerMin,
    allowedRepos,
  } = getConfig()
  const octokit = createOctokit(githubToken)
  const rateLimiter = rateLimitPerMin != null && rateLimitPerMin > 0
    ? createRateLimiter({ windowMs: 60_000, maxPerWindow: rateLimitPerMin })
    : null
  const allowlist = parseAllowlist(allowedRepos ?? undefined)

  createWebhookServer({
    port,
    webhookSecret,
    onPayload: async (_rawBody, parsed, event) => {
      const payload = parsed as Record<string, unknown>
      const ctx = event ? parseWebhookPayload(event, payload) : null
      if (!ctx) return

      if (!isRepoAllowed(ctx.owner, ctx.repo, allowlist)) return

      const trigger = matchTrigger(ctx.commentBody, maxPromptLength)
      if (!trigger.matched) return

      const repoKey = `${ctx.owner}/${ctx.repo}`
      if (rateLimiter && !rateLimiter.check(repoKey)) {
        try {
          await postComment(octokit, {
            owner: ctx.owner,
            repo: ctx.repo,
            issueNumber: ctx.issueNumber,
            discussionId: ctx.discussionId,
            body: `❌ ${RATE_LIMIT_MESSAGE}`,
          })
        }
        catch {
          // Do not log response body
        }
        return
      }

      const outcome = await runRelay(trigger.prompt, defaultWorkspace)
      if (rateLimiter) rateLimiter.record(repoKey)

      const bodyToPost = outcome.success ? outcome.result : `❌ ${outcome.userMessage}`

      try {
        await postComment(octokit, {
          owner: ctx.owner,
          repo: ctx.repo,
          issueNumber: ctx.issueNumber,
          discussionId: ctx.discussionId,
          body: bodyToPost,
        })
      }
      catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.error(`Failed to post comment to ${ctx.owner}/${ctx.repo}:`, msg)
      }
    },
  })
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
