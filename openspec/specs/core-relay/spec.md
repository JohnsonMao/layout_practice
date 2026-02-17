# Spec: core-relay

## ADDED Requirements

### Requirement: Relay request contract

The system SHALL define a canonical request type used by platforms to submit AI tasks. The type MUST include a required prompt string and MAY include optional fields for model and mode.

#### Scenario: Minimal request

- **WHEN** a platform sends a request with only `prompt`
- **THEN** the relay SHALL accept it and forward to the selected provider with default options

#### Scenario: Request with options

- **WHEN** a platform sends a request with `prompt` and `options: { model, mode }`
- **THEN** the relay SHALL pass those options to the provider unchanged (provider MAY ignore unsupported options)

### Requirement: Relay response contract

The system SHALL define a canonical response type returned by the relay to platforms. The response MUST indicate success or failure and MUST include either a result string or an error object with code and message.

#### Scenario: Success response

- **WHEN** a provider completes successfully
- **THEN** the relay SHALL return `{ success: true, result: string }`

#### Scenario: Error response

- **WHEN** a provider or relay fails
- **THEN** the relay SHALL return `{ success: false, error: { code: string, message: string } }`

### Requirement: Provider interface

The system SHALL define a provider interface that accepts the relay request type and returns a promise of the relay response type. Any provider (e.g. cursor-cli) MUST implement this interface.

#### Scenario: Provider execute

- **WHEN** the relay calls `provider.execute(request)`
- **THEN** the provider SHALL return a Promise that resolves to the relay response type

#### Scenario: Provider not available

- **WHEN** the selected provider is not configured or fails to execute
- **THEN** the relay SHALL return an error response with a distinct code (e.g. PROVIDER_UNAVAILABLE)

### Requirement: Coordination of platform and provider

The core SHALL coordinate a single flow: receive a request from a platform, invoke the configured provider with that request, and return the provider response to the platform. Core SHALL NOT depend on any concrete platform or provider package.

#### Scenario: Happy path

- **WHEN** a platform submits a valid request and a provider is configured
- **THEN** the relay SHALL call the provider once and return its response to the platform

#### Scenario: No provider configured

- **WHEN** a request is submitted but no provider is configured for the requested or default provider key
- **THEN** the relay SHALL return an error response without calling any provider
