## ADDED Requirements

### Requirement: Automated Type Synchronization
The system SHALL automatically generate TypeScript type definitions from Rust data structures used in the Tauri backend.

#### Scenario: Type Generation
- **WHEN** a developer adds a `#[derive(specta::Type)]` macro to a Rust struct
- **THEN** a corresponding TypeScript interface SHALL be generated during build or dev time

### Requirement: Command Invocation Bridge
The system SHALL expose a secure IPC bridge for the React frontend to call Rust commands.

#### Scenario: Calling Rust Command
- **WHEN** the React frontend uses `invoke('my_command')`
- **THEN** the Rust backend SHALL execute the corresponding function and return a JSON-serialized result

### Requirement: Event Streaming Bridge
The system SHALL support bidirectional event streaming between Rust and TypeScript.

#### Scenario: Backend Event Notification
- **WHEN** the Rust backend emits an event via the Tauri window handle
- **THEN** the React frontend SHALL receive the event payload via a registered listener
