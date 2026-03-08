import { Octokit } from '@octokit/rest'
import type { WebhookContext } from './payload.js'

/** GitHub comment body limit (leave margin). */
const COMMENT_MAX_LENGTH = 65_500
const TRUNCATE_SUFFIX = '\n\n… (truncated)'

export function truncateForGitHub(text: string, maxLength: number = COMMENT_MAX_LENGTH): string {
  if (text.length <= maxLength)
    return text
  return text.slice(0, maxLength - TRUNCATE_SUFFIX.length) + TRUNCATE_SUFFIX
}

export interface PostCommentParams {
  owner: string
  repo: string
  issueNumber?: number
  discussionId?: number
  body: string
}

/**
 * Post a comment to an issue/PR or discussion using GitHub API.
 * Uses GITHUB_TOKEN for auth. Truncates body to COMMENT_MAX_LENGTH.
 */
export async function postComment(octokit: Octokit, params: PostCommentParams): Promise<void> {
  const body = truncateForGitHub(params.body)
  if (params.issueNumber != null) {
    await octokit.rest.issues.createComment({
      owner: params.owner,
      repo: params.repo,
      issue_number: params.issueNumber,
      body,
    })
    return
  }
  if (params.discussionId != null) {
    await octokit.request('POST /repos/{owner}/{repo}/discussions/{discussion_number}/comments', {
      owner: params.owner,
      repo: params.repo,
      discussion_number: params.discussionId,
      body,
    })
    return
  }
  throw new Error('Either issueNumber or discussionId is required')
}

export function createOctokit(token: string): Octokit {
  return new Octokit({ auth: token })
}
