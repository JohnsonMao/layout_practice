## ADDED Requirements

### Requirement: Centralized orchestration types
The core package SHALL provide standardized types for LLM orchestration, including `RelayContext` and `CreateChatProvider`, to enable decoupled communication between the composition root and platforms.

#### Scenario: Platform uses core types
- **WHEN** a platform implementation is initialized
- **THEN** it SHALL use the `RelayContext` interface provided by `@agent-relay/core`.

### Requirement: Dependency Injection for Platforms
The `Platform` interface SHALL support dependency injection by accepting a `RelayContext` during initialization.

#### Scenario: Platform receives dependencies
- **WHEN** the service initializes a platform
- **THEN** it SHALL pass a fully-constructed `RelayContext` to the platform's `init()` method.
