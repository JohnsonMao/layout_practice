# Spec: platform-discord

## Purpose

Discord bot integration: register slash commands, send relay requests, post responses within Discord message limits, and read configuration from environment. The bot uses core relay types only and does not contain provider-specific logic.

## Requirements

### Requirement: Slash command to trigger AI task

The Discord bot SHALL register at least one slash command that allows the user to start an AI interaction. The command SHALL be deployable via the existing deploy-commands flow. The primary command SHALL be `/create-chat` with a required title and optional workspace (and optionally model); AI interaction then continues in the created thread via messages.

#### Scenario: User runs slash command to create chat

- **WHEN** a user invokes the slash command with a required title (and optionally workspace and model)
- **THEN** the bot SHALL create a new Public Thread (name from the title), SHALL create a chat session (e.g. via provider create-chat), SHALL reply in the parent channel with a reference to the thread, and SHALL post in the thread the model and workspace in use so the user can interact there

#### Scenario: Slash command registered

- **WHEN** the deploy-commands task runs for the Discord application
- **THEN** the slash command(s) SHALL be registered with Discord so they appear in the client

### Requirement: Relay integration

The Discord bot SHALL use the core relay types and coordination to submit requests and SHALL use a configured provider. The provider SHALL be one of: cursor-cli (existing) or copilot-sdk. The bot SHALL not contain provider-specific logic beyond configuration and the minimal wiring required to invoke the chosen provider (e.g. relay adapter or provider interface).

#### Scenario: Successful relay response

- **WHEN** the relay returns success with a result string
- **THEN** the bot SHALL post or reply with the result content, subject to Discord message length limits

#### Scenario: Relay error response

- **WHEN** the relay returns an error
- **THEN** the bot SHALL post or reply with a user-facing error message derived from the error code and message

#### Scenario: Provider selection

- **WHEN** the bot is configured to use a given provider (e.g. via environment or config)
- **THEN** the bot SHALL use that provider for create-chat and for follow-up messages in thread; SHALL NOT mix providers for the same thread

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

### Requirement: Create-chat command and thread isolation

The Discord bot SHALL register a slash command `/create-chat` with a required **title** option and optional **workspace** and **model** options. When invoked in a text channel that supports threads, the bot SHALL create a new Public Thread with the given title (truncated to the platform limit if needed), SHALL create a chat session (e.g. via provider create-chat) for that thread, SHALL store the session id and optional model and workspace for the thread, and SHALL post in the thread the model and workspace in use. All subsequent streaming and follow-up interaction SHALL occur within that thread.

#### Scenario: Create thread and show session info

- **WHEN** a user invokes /create-chat with a title (and optionally workspace and model) in a text channel
- **THEN** the bot SHALL create a Public Thread with name derived from the title, SHALL reply in the parent channel with a reference to the thread, SHALL create a chat session (e.g. by calling provider create-chat), SHALL persist the thread id, session id, workspace, and optional model, and SHALL send a message in the thread showing the model and workspace in use

#### Scenario: Thread as workspace

- **WHEN** a thread is owned by this bot (thread.ownerId equals the bot's user id) and a session has been stored for that thread (threadId ↔ sessionId, with workspace and optional model)
- **THEN** that thread SHALL be treated as a workspace for follow-up messages using the stored session (resume), and SHALL NOT use in-thread conversation history as prompt content

#### Scenario: Create-chat failure

- **WHEN** creating the chat session (e.g. provider create-chat) fails
- **THEN** the bot SHALL post a user-facing error message in the thread and SHALL NOT store a session for that thread

### Requirement: This-bot thread identification

The bot SHALL treat a thread as a follow-up workspace only if the thread is owned by this application's bot. The bot SHALL determine this by comparing the thread's owner id (thread.ownerId) to the current client user id (e.g. client.user.id). Threads owned by other bots or users SHALL NOT be treated as follow-up targets.

#### Scenario: Thread owned by this bot

- **WHEN** the thread owner id (thread.ownerId) equals the bot's user id
- **THEN** the bot SHALL consider that thread eligible for follow-up (if a session is stored)

#### Scenario: Thread not owned by this bot

- **WHEN** the thread owner id is not the current bot's user id
- **THEN** the bot SHALL NOT treat messages in that thread as follow-up prompts

### Requirement: Thread-session persistence

The bot SHALL persist the mapping from Discord thread id to provider session id (threadId ↔ sessionId) so that it survives process restart. When /create-chat succeeds, the bot SHALL store the thread id, session id (from the create-chat result), workspace path, and optional model (e.g. in SQLite). When the relay stream during a follow-up yields a system chunk with sessionId, the bot MAY update the stored session (e.g. if not already stored). The bot SHALL use the stored mapping to resolve sessionId, workspace, and optional model when handling follow-up messages in that thread. The bot SHALL determine "this bot's thread" by thread owner id (thread.ownerId equals the bot's user id).

#### Scenario: Store session when create-chat succeeds

- **WHEN** /create-chat completes successfully and the provider returns a session id (chat id)
- **THEN** the bot SHALL persist the thread id, session id, workspace, and optional model for that thread (e.g. INSERT OR REPLACE into SQLite)

#### Scenario: Resolve session for follow-up

- **WHEN** a user sends a follow-up message in a thread and the bot checks for a stored session
- **THEN** the bot SHALL look up sessionId, workspace, and optional model for that thread id from the persistent store and SHALL use them for the relay request (resume, with options.model when stored)

### Requirement: Streaming response and status message

The bot SHALL use relay.runStream for follow-up messages in thread (not for /create-chat, which does not send an initial prompt). It SHALL maintain a single status message that is updated with stream progress: accumulated text, or tool_call progress (text assembled from toolName, isCompleted, isRejected: e.g. "tool calling: X", "tool done: X", "tool reject: X"). When the stream yields a system chunk (sessionId), the bot MAY update the status (e.g. show model or "連線中"). When a tool_call chunk has isCompleted true and the stream is not done, the bot SHALL send a new status message ("thinking") and use it for subsequent updates. When the stream ends (done or error), the bot SHALL remove the status message. The bot SHALL truncate status message content to fit Discord message length limits when editing.

#### Scenario: Status updates during stream

- **WHEN** runStream yields text or tool_call chunks
- **THEN** the bot SHALL edit the current status message with the assembled content (or send a new "thinking" message after a tool_call isCompleted)

#### Scenario: Stream end

- **WHEN** the stream yields done or error
- **THEN** the bot SHALL remove the status message and SHALL post an error message to the thread if the stream ended with error

### Requirement: Follow-up in thread

The Discord bot SHALL listen for MessageCreate in threads that are owned by this bot (thread.ownerId equals the bot's user id) and have a stored session (threadId ↔ sessionId in persistent store). When a non-bot user sends a message that does not start with "/", the bot SHALL treat it as a follow-up prompt: SHALL call runStream with the stored sessionId (resume) and the new message content only (SHALL NOT build or pass conversation history in the prompt), and SHALL stream the response in that thread.

#### Scenario: Follow-up message

- **WHEN** a user sends a normal message (no slash) in a thread that is owned by this bot and has a stored session
- **THEN** the bot SHALL run the relay with sessionId (resume) and the new message only, and SHALL stream the response in that thread

#### Scenario: Ignore non-follow-up

- **WHEN** a message is sent in a thread that has no stored session, or is not owned by this bot, or is from the bot, or is a slash command
- **THEN** the bot SHALL NOT treat it as a follow-up prompt

### Requirement: Tool call progress in status message

When the stream yields a chunk of type tool_call, the bot SHALL edit the current status message to show tool progress. The bot SHALL assemble the display text from the chunk's toolName, isCompleted, and isRejected (e.g. "tool calling: shellToolCall", "tool done: shellToolCall", "tool reject: shellToolCall"). When the chunk has isCompleted true and more chunks may follow, the bot SHALL send a new "thinking" status message and use it for subsequent updates.

#### Scenario: Show tool progress

- **WHEN** runStream yields a tool_call chunk
- **THEN** the bot SHALL update the current status message with the assembled tool text (no separate message per tool call)

#### Scenario: After tool completed

- **WHEN** a tool_call chunk has isCompleted true
- **THEN** the bot SHALL send a new "thinking" status message so the next update (text or next tool) edits that message

### Requirement: Rate limiting

The Discord bot SHALL enforce a per-user rate limit (default: 5 requests per 60-second window) for relay-triggering actions: /create-chat and follow-up messages in thread. When the limit is exceeded, the bot SHALL respond with a user-facing message and SHALL NOT call the relay (or create-chat).

#### Scenario: Under limit

- **WHEN** a user triggers /create-chat or a follow-up and has not exceeded the limit
- **THEN** the bot SHALL proceed and SHALL record the request for rate limit purposes

#### Scenario: Over limit

- **WHEN** a user has already made 5 or more requests in the last 60 seconds
- **THEN** the bot SHALL NOT call the relay or create-chat and SHALL reply with a message indicating the rate limit (e.g. "請求過於頻繁，請稍後再試")
