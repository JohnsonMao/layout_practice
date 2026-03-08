## ADDED Requirements

### Requirement: Unified service entry point
The `relay-service` SHALL provide a unified entry point that can initialize and run multiple platform integrations (Discord, GitHub, Slack) based on environment configuration.

#### Scenario: Start with multiple platforms
- **WHEN** the `RELAY_PLATFORMS` environment variable is set to `discord,github` and the service is started
- **THEN** the service SHALL initialize both `platform-discord` and `platform-github` handlers and SHALL start listening for events from both platforms

### Requirement: Configuration-driven platform loading
The service SHALL dynamically load only the platforms specified in the configuration. It MUST NOT start or initialize any platform that is not explicitly enabled.

#### Scenario: Only specified platform starts
- **WHEN** `RELAY_PLATFORMS` is set to `discord` and the service is started
- **THEN** the service SHALL initialize `platform-discord` and SHALL NOT initialize `platform-github` or any other platform

### Requirement: Graceful startup and failure
The service SHALL provide clear feedback if an enabled platform fails to initialize (e.g., due to missing configuration or network errors) and MUST NOT start listening if any required configuration for enabled platforms is missing.

#### Scenario: Fail fast on missing config
- **WHEN** `RELAY_PLATFORMS` includes `discord` but `DISCORD_TOKEN` is missing
- **THEN** the service SHALL log a descriptive error and SHALL exit with a non-zero exit code
