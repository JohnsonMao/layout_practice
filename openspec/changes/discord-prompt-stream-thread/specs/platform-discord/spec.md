# Delta Spec: platform-discord (discord-prompt-stream-thread)

## ADDED Requirements

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

The bot SHALL listen for MessageCreate in threads that have an associated workspace (conversation history). When a non-bot user sends a message that does not start with "/", the bot SHALL treat it as a follow-up prompt: SHALL build a single prompt from the thread history plus the new message, SHALL call runStream with that prompt, and SHALL append the new user and assistant messages to the thread history on success.

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
