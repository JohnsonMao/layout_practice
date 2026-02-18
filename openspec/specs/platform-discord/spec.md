# Spec: platform-discord

## Purpose

Discord bot integration: register slash commands, send relay requests, post responses within Discord message limits, and read configuration from environment. The bot uses core relay types only and does not contain provider-specific logic.

## Requirements

### Requirement: Slash command to trigger AI task

The Discord bot SHALL register at least one slash command that accepts a prompt (or equivalent) and triggers the relay to run an AI task. The command SHALL be deployable via the existing deploy-commands flow.

#### Scenario: User runs slash command with prompt

- **WHEN** a user invokes the slash command with a required prompt argument
- **THEN** the bot SHALL send a relay request with that prompt to the core and SHALL reply in the same channel or as an ephemeral reply with the relay response

#### Scenario: Slash command registered

- **WHEN** the deploy-commands task runs for the Discord application
- **THEN** the slash command(s) SHALL be registered with Discord so they appear in the client

### Requirement: Relay integration

The Discord bot SHALL use the core relay types and coordination to submit requests and SHALL use a configured provider (e.g. cursor-cli). The bot SHALL not contain provider-specific logic beyond configuration.

#### Scenario: Successful relay response

- **WHEN** the relay returns success with a result string
- **THEN** the bot SHALL post or reply with the result content, subject to Discord message length limits

#### Scenario: Relay error response

- **WHEN** the relay returns an error
- **THEN** the bot SHALL post or reply with a user-facing error message derived from the error code and message

### Requirement: Message length limits

The bot SHALL respect Discord message length limits (e.g. 2000 characters). When the relay result exceeds the limit, the bot SHALL truncate the content and indicate truncation (e.g. suffix or notice) so the user knows the response was cut.

#### Scenario: Result within limit

- **WHEN** the relay result length is within the allowed limit
- **THEN** the bot SHALL send the full result in one message (or reply)

#### Scenario: Result over limit

- **WHEN** the relay result exceeds the allowed limit
- **THEN** the bot SHALL send a truncated version and SHALL append a clear truncation notice (e.g. "... (truncated)")

### Requirement: Authentication and configuration

The bot SHALL read its Discord token and any provider-related configuration (e.g. default provider key) from environment variables or a supported config mechanism. The bot SHALL fail fast at startup if required configuration is missing.

#### Scenario: Missing token

- **WHEN** the bot starts and the Discord token is not set
- **THEN** the bot SHALL exit with an error and SHALL NOT connect to Discord

#### Scenario: Required config present

- **WHEN** the Discord token and relay provider configuration are present
- **THEN** the bot SHALL start and SHALL be able to handle slash commands that use the relay

### Requirement: Prompt command and thread isolation

The Discord bot SHALL register a slash command `/prompt` with a required prompt option. When invoked in a text channel that supports threads, the bot SHALL create a new Public Thread (name derived from the prompt) and SHALL perform all streaming and follow-up interaction within that thread.

#### Scenario: Create thread and stream

- **WHEN** a user invokes /prompt with a prompt in a text channel
- **THEN** the bot SHALL create a Public Thread, SHALL reply in the parent channel with a reference to the thread, and SHALL send the initial "processing" message and streamed response inside the thread

#### Scenario: Thread as workspace

- **WHEN** a thread has been created by /prompt and at least one response has been completed
- **THEN** that thread SHALL be treated as a workspace with its own conversation history for follow-up messages

### Requirement: Streaming response with throttle

The bot SHALL use relay.runStream for /prompt (and for follow-up in thread). It SHALL update a single "processing" message at most once every 2 seconds with accumulated text, and SHALL handle tool_call chunks by posting an approval message (see tool approval). When the stream ends, if the full response exceeds Discord message length limit, the bot SHALL send multiple messages or delete the status message and send the full content in chunks.

#### Scenario: Throttled updates

- **WHEN** runStream yields text chunks
- **THEN** the bot SHALL not edit the message more often than once per 2 seconds (except when flushing on tool_call, done, or error)

#### Scenario: Long final response

- **WHEN** the stream ends with success and the full text exceeds the Discord message limit
- **THEN** the bot SHALL remove or replace the status message and SHALL send the content in one or more messages each within the limit

### Requirement: Follow-up in thread

The Discord bot SHALL listen for MessageCreate in threads that have an associated workspace (conversation history). When a non-bot user sends a message that does not start with "/", the bot SHALL treat it as a follow-up prompt: SHALL build a single prompt from the thread history plus the new message, SHALL call runStream with that prompt, and SHALL append the new user and assistant messages to the thread history on success.

#### Scenario: Follow-up message

- **WHEN** a user sends a normal message (no slash) in a thread that has history
- **THEN** the bot SHALL run the relay with the full conversation context and SHALL stream the response in that thread and update history

#### Scenario: Ignore non-follow-up

- **WHEN** a message is sent in a thread that has no history, or is from the bot, or is a slash command
- **THEN** the bot SHALL NOT treat it as a follow-up prompt

### Requirement: Tool call approval UI

When the stream yields a chunk of type tool_call, the bot SHALL post a message in the same thread describing the tool call and SHALL attach buttons (e.g. "核准" / "拒絕") with distinct customIds. When the user clicks a button, the bot SHALL reply (e.g. ephemeral) with a confirmation (e.g. "已核准" or "已拒絕"). The bot need not send the approval result back to the CLI in this change.

#### Scenario: Show tool call and buttons

- **WHEN** runStream yields a tool_call chunk
- **THEN** the bot SHALL send a message in the thread with the tool call info and interactive buttons for approve/reject

#### Scenario: Button interaction

- **WHEN** a user clicks the approve or reject button
- **THEN** the bot SHALL acknowledge the interaction with a short confirmation message

### Requirement: Rate limiting

The bot SHALL enforce a per-user rate limit (default: 5 requests per 60-second window) for relay-triggering actions: /ask, /prompt, and follow-up messages in thread. When the limit is exceeded, the bot SHALL respond with a user-facing message and SHALL NOT call the relay.

#### Scenario: Under limit

- **WHEN** a user triggers /ask, /prompt, or a follow-up and has not exceeded the limit
- **THEN** the bot SHALL proceed to call the relay and SHALL record the request for rate limit purposes

#### Scenario: Over limit

- **WHEN** a user has already made 5 or more requests in the last 60 seconds
- **THEN** the bot SHALL NOT call the relay and SHALL reply with a message indicating the rate limit (e.g. "請求過於頻繁，請稍後再試")
