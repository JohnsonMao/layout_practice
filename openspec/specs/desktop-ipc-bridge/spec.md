# desktop-ipc-bridge Specification

## Purpose

TBD - created by archiving change 'add-tauri-desktop-app'. Update Purpose after archive.

## Requirements

### Requirement: Automated Type Synchronization
The system SHALL automatically generate TypeScript type definitions from Rust data structures used in the Tauri backend.

#### Scenario: Type Generation
- **WHEN** a developer adds a `#[derive(specta::Type)]` macro to a Rust struct
- **THEN** a corresponding TypeScript interface SHALL be generated during build or dev time


<!-- @trace
source: add-tauri-desktop-app
updated: 2026-03-22
code:
  - apps/desktop/public/vite.svg
  - apps/desktop/index.html
  - apps/desktop/src-tauri/icons/128x128@2x.png
  - apps/desktop/src-tauri/icons/StoreLogo.png
  - apps/desktop/src-tauri/icons/128x128.png
  - apps/desktop/src-tauri/icons/Square107x107Logo.png
  - apps/desktop/src-tauri/src/main.rs
  - apps/desktop/src/vite-env.d.ts
  - apps/desktop/tsconfig.json
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/icons/icon.ico
  - apps/desktop/src-tauri/icons/Square142x142Logo.png
  - apps/desktop/src-tauri/icons/Square310x310Logo.png
  - apps/desktop/src/assets/react.svg
  - apps/desktop/vite.config.ts
  - apps/desktop/src/App.tsx
  - apps/desktop/src-tauri/build.rs
  - apps/desktop/src-tauri/icons/Square44x44Logo.png
  - apps/desktop/tsconfig.node.json
  - turbo.json
  - apps/desktop/package.json
  - apps/desktop/src-tauri/capabilities/default.json
  - apps/desktop/src-tauri/icons/icon.png
  - apps/desktop/src-tauri/icons/Square150x150Logo.png
  - apps/desktop/src-tauri/icons/icon.icns
  - apps/desktop/src-tauri/icons/32x32.png
  - apps/desktop/src-tauri/tauri.conf.json
  - apps/desktop/src-tauri/icons/Square89x89Logo.png
  - apps/desktop/src/App.css
  - apps/desktop/src-tauri/icons/Square71x71Logo.png
  - apps/desktop/src/main.tsx
  - apps/desktop/src-tauri/icons/Square30x30Logo.png
  - package.json
  - apps/desktop/src-tauri/icons/Square284x284Logo.png
  - apps/desktop/.vscode/extensions.json
  - apps/desktop/README.md
  - apps/desktop/public/tauri.svg
  - apps/desktop/src-tauri/src/lib.rs
  - pnpm-workspace.yaml
-->

---
### Requirement: Command Invocation Bridge
The system SHALL expose a secure IPC bridge for the React frontend to call Rust commands.

#### Scenario: Calling Rust Command
- **WHEN** the React frontend uses `invoke('my_command')`
- **THEN** the Rust backend SHALL execute the corresponding function and return a JSON-serialized result

#### Scenario: Invoke run_cli_relay
- **WHEN** the frontend invokes `run_cli_relay` with `provider_name`, `prompt`, and optional `session_id`/`workspace`
- **THEN** the Rust backend SHALL initialize the specified provider and start the relay stream


<!-- @trace
source: refactor-ai-cli-relay-to-rust
updated: 2026-03-28
code:
  - apps/desktop/src-tauri/src/providers/copilot.rs
  - apps/desktop/src-tauri/src/providers/cursor.rs
  - apps/desktop/src-tauri/src/engine.rs
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src/App.tsx
  - apps/desktop/src/types/bindings.ts
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/src/providers/gemini.rs
  - apps/desktop/src-tauri/src/providers/mod.rs
-->

---
### Requirement: Event Streaming Bridge
The system SHALL support bidirectional event streaming between Rust and TypeScript.

#### Scenario: Backend Event Notification
- **WHEN** the Rust backend emits an event via the Tauri window handle
- **THEN** the React frontend SHALL receive the event payload via a registered listener

#### Scenario: Relay Stream Events
- **WHEN** the `run_cli_relay` command is active
- **THEN** the backend SHALL emit `RelayEvent` chunks that the frontend can listen to for real-time updates

<!-- @trace
source: refactor-ai-cli-relay-to-rust
updated: 2026-03-28
code:
  - apps/desktop/src-tauri/src/providers/copilot.rs
  - apps/desktop/src-tauri/src/providers/cursor.rs
  - apps/desktop/src-tauri/src/engine.rs
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src/App.tsx
  - apps/desktop/src/types/bindings.ts
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src-tauri/src/providers/gemini.rs
  - apps/desktop/src-tauri/src/providers/mod.rs
-->