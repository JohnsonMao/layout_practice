# Spec: copilot-sdk-integration

## Purpose

Integration of GitHub Copilot SDK within the Discord app: manage connection to Copilot CLI (or existing server), map thread sessions to SDK sessions, send user messages and receive streamed or final results, handle errors and timeouts, and support required environment and authentication configuration.

## Requirements

### Requirement: Copilot SDK client lifecycle

The Discord bot SHALL use the Copilot SDK (e.g. `@github/copilot-sdk`) to communicate with the Copilot CLI in server mode. The bot SHALL manage the CLI process lifecycle or connect to an existing server as per SDK documentation. The bot SHALL NOT contain custom JSON-RPC or CLI spawning logic beyond what the SDK provides.

#### Scenario: SDK connects to CLI

- **WHEN** the bot is configured to use Copilot as the provider and the Copilot CLI is available (or an external server is reachable)
- **THEN** the bot SHALL establish a connection via the SDK and SHALL be able to create sessions and send prompts

#### Scenario: CLI or server unavailable

- **WHEN** the Copilot CLI is not installed or the configured server is unreachable
- **THEN** the bot SHALL return a user-facing error (e.g. at create-chat or first use) and SHALL NOT crash the process

### Requirement: Thread-to-SDK session mapping

The bot SHALL map each Discord thread that uses Copilot to exactly one SDK session (or equivalent conversation handle). When create-chat is invoked with Copilot as the provider, the bot SHALL create a session via the SDK and SHALL store the thread id and session identifier in the existing thread-session store. Follow-up messages in that thread SHALL be sent to the same SDK session (resume).

#### Scenario: Create session for thread

- **WHEN** a user invokes /create-chat in a channel and the configured provider is Copilot
- **THEN** the bot SHALL create a session via the Copilot SDK, SHALL persist threadId and session id (or handle), and SHALL post session info in the thread

#### Scenario: Follow-up uses same session

- **WHEN** a user sends a follow-up message in a thread that has a stored Copilot session
- **THEN** the bot SHALL send the message to that SDK session and SHALL stream or return the response in the thread

### Requirement: Streaming and final result delivery

The bot SHALL use the SDK's streaming API (when available) to receive incremental responses and SHALL update the thread with progress (e.g. status message) and final content. When streaming is not used or the stream ends, the bot SHALL post the full or accumulated result to the thread, subject to Discord message length limits and existing truncation behavior.

#### Scenario: Streamed response

- **WHEN** the Copilot SDK yields streamed chunks for a follow-up
- **THEN** the bot SHALL update the thread (e.g. single status message or final message) and SHALL apply the same length and truncation rules as for other providers

#### Scenario: Final or non-streamed result

- **WHEN** the SDK returns a final result without streaming
- **THEN** the bot SHALL post the result in the thread and SHALL truncate with notice if over the message limit

### Requirement: Copilot authentication and configuration

The bot SHALL read Copilot-related configuration from environment variables or the existing config mechanism (e.g. `COPILOT_GITHUB_TOKEN`, `GH_TOKEN`, `GITHUB_TOKEN`, or BYOK-related variables as per SDK documentation). The bot SHALL NOT prompt for credentials in Discord; it SHALL use only preconfigured credentials. When the configured provider is Copilot and required credentials are missing, the bot SHALL fail fast at startup or SHALL return a clear error when the user first triggers a Copilot action.

#### Scenario: Required Copilot config present

- **WHEN** the bot is configured to use Copilot and the required token (or BYOK) is set
- **THEN** the bot SHALL be able to create sessions and run prompts via the SDK

#### Scenario: Copilot configured but credentials missing

- **WHEN** the provider is set to Copilot but the required environment variable(s) are not set
- **THEN** the bot SHALL either fail at startup with a clear message or SHALL return a user-facing error on first Copilot use (e.g. "Copilot 未設定認證")

### Requirement: Error and timeout handling

The bot SHALL handle SDK and CLI errors (e.g. timeout, connection lost, SDK-reported errors) and SHALL surface user-facing error messages in the thread. The bot SHALL NOT expose raw stack traces or internal error details to the user.

#### Scenario: SDK or CLI error

- **WHEN** the Copilot SDK or CLI returns an error or times out
- **THEN** the bot SHALL post a short, user-facing error message in the thread and SHALL optionally log the full error server-side

#### Scenario: Timeout

- **WHEN** a Copilot request exceeds the configured timeout
- **THEN** the bot SHALL stop waiting, SHALL post a timeout message to the user, and SHALL leave the session in a consistent state (e.g. usable for retry or next message)
