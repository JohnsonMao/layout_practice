# Spec delta: platform-discord

## MODIFIED Requirements

### Requirement: Prompt command and thread isolation

The Discord bot SHALL register a slash command `/prompt` with a required prompt option. When invoked in a text channel that supports threads, the bot SHALL create a new Public Thread (name derived from the prompt) and SHALL perform all streaming and follow-up interaction within that thread.

#### Scenario: Create thread and stream

- **WHEN** a user invokes /prompt with a prompt in a text channel
- **THEN** the bot SHALL create a Public Thread, SHALL reply in the parent channel with a reference to the thread, and SHALL send the initial "processing" message and streamed response inside the thread

#### Scenario: Thread as workspace

- **WHEN** a thread is owned by this bot (thread.ownerId equals the bot's user id) and a session has been stored for that thread (threadId ↔ sessionId) after the stream has yielded a sessionId
- **THEN** that thread SHALL be treated as a workspace for follow-up messages using the stored session (resume), and SHALL NOT use in-thread conversation history as prompt content

### Requirement: Follow-up in thread

The Discord bot SHALL listen for MessageCreate in threads that are owned by this bot and have a stored session (threadId ↔ sessionId, e.g. in SQLite). When a non-bot user sends a message that does not start with "/", the bot SHALL treat it as a follow-up prompt: SHALL call runStream with the stored sessionId (resume) and the new message content only (SHALL NOT build or pass conversation history in the prompt), and SHALL stream the response in that thread. The bot SHALL NOT append user or assistant messages to an in-memory history for prompt assembly.

#### Scenario: Follow-up message

- **WHEN** a user sends a normal message (no slash) in a thread that is owned by this bot and has a stored session
- **THEN** the bot SHALL run the relay with the stored sessionId (resume) and the new message only, and SHALL stream the response in that thread

#### Scenario: Ignore non-follow-up

- **WHEN** a message is sent in a thread that has no stored session, or is not owned by this bot, or is from the bot, or is a slash command
- **THEN** the bot SHALL NOT treat it as a follow-up prompt

## ADDED Requirements

### Requirement: Thread-session persistence

The bot SHALL persist the mapping from Discord thread id to Cursor session id (threadId ↔ sessionId) so that it survives process restart. When a /prompt run in a thread receives a system chunk with sessionId from the relay stream, the bot SHALL store that mapping (e.g. in SQLite) together with the thread's workspace path (cwd) if applicable. The bot SHALL use this stored mapping to resolve sessionId when handling follow-up messages in that thread.

#### Scenario: Store session when stream yields sessionId

- **WHEN** the relay stream yields a chunk of type system with sessionId (e.g. from Cursor CLI stream-json) during a /prompt run in a thread
- **THEN** the bot SHALL persist the thread id, session_id, and cwd (e.g. INSERT OR REPLACE into SQLite) for that thread

#### Scenario: Resolve session for follow-up

- **WHEN** a user sends a follow-up message in a thread and the bot checks for a stored session
- **THEN** the bot SHALL look up the session_id (and cwd) for that thread id from the persistent store and SHALL use it for the relay request (resume)

### Requirement: This-bot thread identification

The bot SHALL treat a thread as a follow-up workspace only if the thread is owned by this application's bot. The bot SHALL determine this by comparing the thread's owner id (thread.ownerId) to the current client user id (e.g. client.user.id). Threads owned by other bots or users SHALL NOT be treated as follow-up targets.

#### Scenario: Thread owned by this bot

- **WHEN** the thread owner id (thread.ownerId) equals the bot's user id
- **THEN** the bot SHALL consider that thread eligible for follow-up (if a session is stored)

#### Scenario: Thread not owned by this bot

- **WHEN** the thread owner id is not the current bot's user id
- **THEN** the bot SHALL NOT treat messages in that thread as follow-up prompts
