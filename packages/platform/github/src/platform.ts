import type { Platform, RelayContext } from '@agent-relay/core'
import type { Octokit } from '@octokit/rest'
import { getConfig } from './config'
import { createOctokit, postComment } from './github'
import { parseWebhookPayload } from './payload'
import { createRateLimiter, isRepoAllowed, parseAllowlist } from './rate-limit'
import { runRelay } from './relay'
import { createWebhookServer } from './server'
import { matchTrigger } from './trigger'

const RATE_LIMIT_MESSAGE = '請求過於頻繁，請稍後再試'

export class PlatformGitHub implements Platform {
  readonly name = 'github'
  private octokit: Octokit | null = null
  private server: any = null // The return of createWebhookServer
  private ctx: RelayContext | null = null

  async init(ctx: RelayContext): Promise<void> {
    const { githubToken } = getConfig()
    if (!githubToken) {
      throw new Error('GITHUB_TOKEN is missing')
    }
    this.octokit = createOctokit(githubToken)
    this.ctx = ctx
  }

  async start(): Promise<void> {
    const {
      webhookSecret,
      port,
      maxPromptLength,
      rateLimitPerMin,
      allowedRepos,
    } = getConfig()

    if (!webhookSecret) {
      throw new Error('WEBHOOK_SECRET is missing')
    }

    const rateLimiter = rateLimitPerMin != null && rateLimitPerMin > 0
      ? createRateLimiter({ windowMs: 60_000, maxPerWindow: rateLimitPerMin })
      : null
    const allowlist = parseAllowlist(allowedRepos ?? undefined)

    this.server = createWebhookServer({
      port,
      webhookSecret,
      onPayload: async (_rawBody, parsed, event) => {
        if (!this.octokit)
          return
        const payload = parsed as Record<string, unknown>
        const ctx = event ? parseWebhookPayload(event, payload) : null
        if (!ctx)
          return

        if (!isRepoAllowed(ctx.owner, ctx.repo, allowlist))
          return

        const trigger = matchTrigger(ctx.commentBody, maxPromptLength)
        if (!trigger.matched)
          return

        const repoKey = `${ctx.owner}/${ctx.repo}`
        if (rateLimiter && !rateLimiter.check(repoKey)) {
          try {
            await postComment(this.octokit, {
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

        const outcome = await runRelay(trigger.prompt, this.ctx!)
        if (rateLimiter)
          rateLimiter.record(repoKey)

        const bodyToPost = outcome.success ? outcome.result : `❌ ${outcome.userMessage}`

        try {
          await postComment(this.octokit, {
            owner: ctx.owner,
            repo: ctx.repo,
            issueNumber: ctx.issueNumber,
            discussionId: ctx.discussionId,
            body: bodyToPost,
          })
        }
        catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error(`[GitHub] Failed to post comment to ${ctx.owner}/${ctx.repo}:`, msg)
        }
      },
    })
  }

  async stop(): Promise<void> {
    if (this.server && this.server.close) {
      await new Promise<void>(resolve => this.server.close(() => resolve()))
      this.server = null
    }
  }
}
