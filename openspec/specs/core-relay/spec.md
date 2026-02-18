# Spec: core-relay

## Purpose

Define the canonical request/response contract and provider interface for the relay. The core coordinates a single flow: platform submits a request, relay invokes the configured provider, returns the response. Core does not depend on any concrete platform or provider.

## Requirements

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

### Requirement: Streaming protocol

The core SHALL define a streaming chunk type (StreamChunk) and an optional StreamingProvider interface. StreamChunk MUST support at least: text (incremental content), tool_call (for approval UI), done, and error.

#### Scenario: StreamingProvider implemented

- **WHEN** a provider implements executeStream(request) returning AsyncGenerator<StreamChunk>
- **THEN** the relay SHALL expose runStream(request) that yields chunks from that generator

#### Scenario: Provider without executeStream

- **WHEN** the configured provider does not implement executeStream
- **THEN** the relay runStream SHALL call provider.execute(request) once and SHALL yield a text chunk (if result non-empty), then a done chunk; on error SHALL yield an error chunk

### Requirement: Relay runStream API

The relay SHALL provide runStream(request) returning AsyncGenerator<StreamChunk, void, undefined>. It SHALL be the primary API for consumers that need incremental or tool_call handling.

#### Scenario: runStream with streaming provider

- **WHEN** runStream is called and the provider is a StreamingProvider
- **THEN** the relay SHALL yield all chunks from provider.executeStream(request) and SHALL not buffer the full response before yielding

#### Scenario: runStream with no provider

- **WHEN** runStream is called and no provider is configured
- **THEN** the relay SHALL yield a single error chunk with code PROVIDER_UNAVAILABLE and SHALL not throw
