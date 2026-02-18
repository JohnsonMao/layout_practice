# Delta Spec: core-relay (discord-prompt-stream-thread)

## ADDED Requirements

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
