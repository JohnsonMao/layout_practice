# Spec: platform-github

## Purpose

GitHub trigger integration: receive webhook events from Issues, Pull Requests, and Discussions; identify trigger intent (e.g. keyword or command); submit relay requests via core relay; post results back as comments. The app SHALL verify webhook signatures and handle secrets securely. It uses core relay types only and does not contain provider-specific logic.

## ADDED Requirements

### Requirement: Trigger from Issues, PRs, and Discussions

The GitHub app SHALL accept webhook deliveries for events that include issue comments, PR comments, and discussion comments (e.g. `issue_comment`, `issues`, `pull_request_review_comment`, `discussion_comment`). The app SHALL treat a payload as a trigger only when the payload body matches a defined trigger rule (e.g. keyword prefix, mention, or command). When the rule matches, the app SHALL build a relay request from the relevant text and SHALL call the relay.

#### Scenario: Trigger matched on issue comment

- **WHEN** a webhook delivery contains an issue comment and the comment body matches the trigger rule
- **THEN** the app SHALL build a relay request from the comment body (or extracted part) and SHALL call the relay with that prompt

#### Scenario: Trigger matched on PR comment

- **WHEN** a webhook delivery contains a PR review or issue comment on a PR and the body matches the trigger rule
- **THEN** the app SHALL build a relay request and SHALL call the relay

#### Scenario: Trigger matched on discussion comment

- **WHEN** a webhook delivery contains a discussion comment and the body matches the trigger rule
- **THEN** the app SHALL build a relay request and SHALL call the relay

#### Scenario: Trigger not matched

- **WHEN** the webhook payload body does not match the trigger rule
- **THEN** the app SHALL NOT call the relay and SHALL NOT post a comment (SHALL respond 200 if the webhook signature is valid)

### Requirement: Relay integration

The GitHub app SHALL use the core relay types and coordination to submit requests and SHALL use a configured provider. The app SHALL NOT contain provider-specific logic beyond configuration and the minimal wiring required to invoke the chosen provider.

#### Scenario: Successful relay response

- **WHEN** the relay returns success with a result string
- **THEN** the app SHALL post the result as a comment on the same Issue, PR, or Discussion, subject to platform comment length limits

#### Scenario: Relay error response

- **WHEN** the relay returns an error
- **THEN** the app SHALL post a user-facing error message derived from the error code and message as a comment

#### Scenario: Provider selection

- **WHEN** the app is configured to use a given provider (e.g. via environment or config)
- **THEN** the app SHALL use that provider for the relay request and SHALL NOT mix providers for the same delivery context

### Requirement: Post result to GitHub

The app SHALL post the relay result (or error) as a comment to the same GitHub context (same issue, PR, or discussion) from which the trigger originated. The app SHALL use the GitHub API with proper authentication (e.g. installation access token or app credentials).

#### Scenario: Post success result

- **WHEN** the relay returns success and the app has the repository and comment target (e.g. issue number, discussion id)
- **THEN** the app SHALL create a comment via the GitHub API with the result content (truncated if needed)

#### Scenario: Post error result

- **WHEN** the relay returns an error
- **THEN** the app SHALL create a comment with a safe, user-facing error message and SHALL NOT expose internal secrets or stack traces

### Requirement: Comment length limits

The app SHALL respect GitHub comment length limits. When the relay result exceeds the limit, the app SHALL truncate the content and SHALL append a clear truncation notice so the user knows the response was cut.

#### Scenario: Result within limit

- **WHEN** the relay result length is within the allowed comment limit
- **THEN** the app SHALL post the full result in one comment

#### Scenario: Result over limit

- **WHEN** the relay result exceeds the allowed limit
- **THEN** the app SHALL post a truncated version and SHALL append a clear truncation notice (e.g. "... (truncated)")

### Requirement: Authentication and configuration

The app SHALL read GitHub App credentials (or token), webhook secret, and relay/provider configuration from environment variables or a supported config mechanism. The app SHALL fail fast at startup if required configuration is missing.

#### Scenario: Missing required config

- **WHEN** the app starts and a required setting (e.g. webhook secret, GitHub App id, private key, or relay provider config) is not set
- **THEN** the app SHALL exit with an error and SHALL NOT start the webhook server

#### Scenario: Required config present

- **WHEN** webhook secret, GitHub credentials, and relay provider configuration are present
- **THEN** the app SHALL start and SHALL be able to handle webhook deliveries that trigger the relay

### Requirement: Webhook signature verification

The app SHALL verify the webhook delivery signature (e.g. `X-Hub-Signature-256`) using the configured webhook secret before processing the payload. The app SHALL use a constant-time comparison to prevent timing attacks. If the signature is missing or invalid, the app SHALL respond with 401 Unauthorized and SHALL NOT process the body or call the relay.

#### Scenario: Valid signature

- **WHEN** a webhook request includes a valid `X-Hub-Signature-256` header that matches the payload body and webhook secret
- **THEN** the app SHALL proceed to parse the payload and SHALL process the event according to trigger rules

#### Scenario: Invalid or missing signature

- **WHEN** the signature header is missing or does not match the payload and webhook secret
- **THEN** the app SHALL respond with 401 and SHALL NOT parse the body, call the relay, or log the raw body

### Requirement: Sensitive data not exposed

The app SHALL NOT log or include in error messages the webhook secret, GitHub private key, API tokens, or any other secret. The app SHALL NOT echo raw webhook payloads or relay responses in logs in a way that could expose secrets.

#### Scenario: Error during processing

- **WHEN** an error occurs during webhook handling or relay call
- **THEN** the app SHALL log only non-sensitive identifiers (e.g. delivery id, repo name) and SHALL NOT log secrets or full payloads

#### Scenario: User-facing error

- **WHEN** the app posts an error message to GitHub
- **THEN** the message SHALL be user-facing only and SHALL NOT contain internal paths, tokens, or stack traces

### Requirement: Input validation for relay prompt

The app SHALL validate and limit the text extracted from the GitHub payload before building the relay prompt. The app SHALL enforce a maximum length for the prompt (e.g. configurable, with a safe default) and SHALL reject or trim payloads that exceed it to avoid DoS or downstream issues.

#### Scenario: Payload body within limit

- **WHEN** the extracted trigger text is within the configured maximum length
- **THEN** the app SHALL build the relay request with that text and SHALL call the relay

#### Scenario: Payload body over limit

- **WHEN** the extracted trigger text exceeds the configured maximum length
- **THEN** the app SHALL NOT call the relay with the full text; the app SHALL either truncate to the limit with a notice or SHALL post a user-facing message asking the user to shorten the input

### Requirement: Optional rate limiting

The app MAY enforce a per-repository or per-user rate limit for relay-triggering events. When rate limiting is enabled and the limit is exceeded, the app SHALL respond to the user (e.g. with a comment) indicating that the limit was exceeded and SHALL NOT call the relay for that request.

#### Scenario: Under limit

- **WHEN** rate limiting is enabled and the requester has not exceeded the limit
- **THEN** the app SHALL process the trigger and SHALL call the relay if the trigger rule matches

#### Scenario: Over limit

- **WHEN** rate limiting is enabled and the requester has exceeded the limit
- **THEN** the app SHALL NOT call the relay and SHALL post a user-facing message indicating the rate limit (e.g. "請求過於頻繁，請稍後再試")
