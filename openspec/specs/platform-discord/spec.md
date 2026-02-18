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
