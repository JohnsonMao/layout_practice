/**
 * Parsed context from a webhook event: repo and target for posting reply.
 */
export interface WebhookContext {
  owner: string
  repo: string
  /** Issue or PR number (for issues and issue_comment). */
  issueNumber?: number
  /** Discussion node_id for GraphQL or number for REST (discussion_comment). */
  discussionId?: number
  /** Comment id for reply (optional; for issue_comment we can use issue number to create new comment). */
  commentBody: string
}

type Payload = Record<string, unknown>

function getRepo(p: Payload): { owner: string, repo: string } | null {
  const r = p.repository as Record<string, unknown> | undefined
  if (!r)
    return null
  const owner = (r.owner as Record<string, unknown>)?.login as string | undefined
  const repo = r.name as string | undefined
  if (!owner || !repo)
    return null
  return { owner, repo }
}

/**
 * Parse webhook payload and extract context for issue_comment, issues, pull_request, discussion_comment.
 * Returns null if event type is not supported or required fields are missing.
 */
export function parseWebhookPayload(event: string, payload: Payload): WebhookContext | null {
  const repo = getRepo(payload)
  if (!repo)
    return null

  if (event === 'issue_comment') {
    const comment = payload.comment as Record<string, unknown> | undefined
    const body = comment?.body as string | undefined
    const issue = payload.issue as Record<string, unknown> | undefined
    const issueNumber = issue?.number as number | undefined
    if (body == null || issueNumber == null)
      return null
    return {
      ...repo,
      issueNumber,
      commentBody: body,
    }
  }

  if (event === 'issues') {
    const issue = payload.issue as Record<string, unknown> | undefined
    const body = issue?.body as string | undefined
    const issueNumber = issue?.number as number | undefined
    if (issueNumber == null)
      return null
    return {
      ...repo,
      issueNumber,
      commentBody: body ?? '',
    }
  }

  if (event === 'pull_request') {
    const pr = payload.pull_request as Record<string, unknown> | undefined
    const body = pr?.body as string | undefined
    const issueNumber = pr?.number as number | undefined
    if (issueNumber == null)
      return null
    return {
      ...repo,
      issueNumber,
      commentBody: body ?? '',
    }
  }

  if (event === 'pull_request_review_comment' || event === 'discussion_comment') {
    const comment = payload.comment as Record<string, unknown> | undefined
    const body = comment?.body as string | undefined
    if (body == null)
      return null
    if (event === 'pull_request_review_comment') {
      const pr = payload.pull_request as Record<string, unknown> | undefined
      const issueNumber = pr?.number as number | undefined
      if (issueNumber == null)
        return null
      return { ...repo, issueNumber, commentBody: body }
    }
    // discussion_comment: we need discussion number for REST API (create discussion comment)
    const discussion = payload.discussion as Record<string, unknown> | undefined
    const discussionId = discussion?.number as number | undefined
    if (discussionId == null)
      return null
    return { ...repo, discussionId, commentBody: body }
  }

  return null
}
