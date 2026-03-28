## MODIFIED Requirements

### Requirement: Command Invocation Bridge
The system SHALL expose a secure IPC bridge for the React frontend to call Rust commands.

#### Scenario: Calling Rust Command
- **WHEN** the React frontend uses `invoke('my_command')`
- **THEN** the Rust backend SHALL execute the corresponding function and return a JSON-serialized result

#### Scenario: Invoke run_cli_relay
- **WHEN** the frontend invokes `run_cli_relay` with `provider_name`, `prompt`, and optional `session_id`/`workspace`
- **THEN** the Rust backend SHALL initialize the specified provider and start the relay stream

### Requirement: Event Streaming Bridge
The system SHALL support bidirectional event streaming between Rust and TypeScript.

#### Scenario: Backend Event Notification
- **WHEN** the Rust backend emits an event via the Tauri window handle
- **THEN** the React frontend SHALL receive the event payload via a registered listener

#### Scenario: Relay Stream Events
- **WHEN** the `run_cli_relay` command is active
- **THEN** the backend SHALL emit `RelayEvent` chunks that the frontend can listen to for real-time updates
