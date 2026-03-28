## ADDED Requirements

### Requirement: Modular Provider Architecture
The Rust backend SHALL implement a modular provider architecture using a trait (e.g., `CliProvider`) to support multiple AI CLI tools.

#### Scenario: Support multiple providers
- **WHEN** the system is initialized
- **THEN** it SHALL be capable of supporting different implementations for `cursor`, `copilot`, and `claude` through the same interface

### Requirement: Unified Stream Protocol
The Rust backend SHALL define a unified event format (e.g., `RelayEvent`) for communicating with the frontend, covering text chunks, system metadata, tool calls, and errors.

#### Scenario: Emit text chunk
- **WHEN** a provider receives a text fragment from a CLI tool
- **THEN** the backend SHALL emit a `RelayEvent::Text` chunk to the frontend

#### Scenario: Emit tool call
- **WHEN** a CLI tool initiates or completes a tool execution
- **THEN** the backend SHALL emit a `RelayEvent::ToolCall` chunk with the tool name and status

### Requirement: Process Lifecycle Management
The system SHALL manage the lifecycle of the spawned CLI processes, ensuring they are properly terminated when the operation completes or fails.

#### Scenario: Termination on completion
- **WHEN** the CLI process exits
- **THEN** the backend SHALL ensure all IO tasks are completed and emit a `RelayEvent::Done` or `RelayEvent::Error` event
