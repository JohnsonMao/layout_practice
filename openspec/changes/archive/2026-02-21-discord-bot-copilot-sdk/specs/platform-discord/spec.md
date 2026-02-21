# Spec: platform-discord (delta)

## MODIFIED Requirements

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
