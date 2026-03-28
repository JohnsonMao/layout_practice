# provider-gemini-cli Specification

## Purpose

TBD - created by archiving change 'implement-gemini-and-copilot-providers'. Update Purpose after archive.

## Requirements

### Requirement: Execute via Gemini CLI
The provider SHALL execute user prompts by invoking the `gemini` CLI tool. It SHALL use the `-p` or `--prompt` flag to pass the user input.

#### Scenario: Successful execution
- **WHEN** the provider receives a prompt and the `gemini` CLI is available
- **THEN** the provider SHALL spawn the `gemini` process with the prompt and return the streamed output


<!-- @trace
source: implement-gemini-and-copilot-providers
updated: 2026-03-28
code:
  - apps/desktop/src-tauri/src/providers/mod.rs
  - apps/desktop/src-tauri/src/engine.rs
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src/App.tsx
  - apps/desktop/src-tauri/src/providers/gemini.rs
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/src/providers/cursor.rs
  - apps/desktop/src/types/bindings.ts
  - apps/desktop/src-tauri/src/providers/copilot.rs
-->

---
### Requirement: Output format support
The provider SHALL request output in `stream-json` format using the `--output-format stream-json` flag. It SHALL parse the NDJSON output into `RelayEvent` objects.

#### Scenario: Parse stream-json events
- **WHEN** the CLI output contains a JSON line with type `chunk` or `text`
- **THEN** the provider SHALL yield a `RelayEvent::Text` containing the content

#### Scenario: Parse tool calls
- **WHEN** the CLI output contains a JSON line with type `call`
- **THEN** the provider SHALL yield a `RelayEvent::ToolCall` with the tool name and state


<!-- @trace
source: implement-gemini-and-copilot-providers
updated: 2026-03-28
code:
  - apps/desktop/src-tauri/src/providers/mod.rs
  - apps/desktop/src-tauri/src/engine.rs
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src/App.tsx
  - apps/desktop/src-tauri/src/providers/gemini.rs
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/src/providers/cursor.rs
  - apps/desktop/src/types/bindings.ts
  - apps/desktop/src-tauri/src/providers/copilot.rs
-->

---
### Requirement: Availability check
The provider SHALL check if the `gemini` binary is available in the system PATH before execution.

#### Scenario: Binary missing
- **WHEN** the `gemini` command is not found
- **THEN** the provider SHALL return `false` for `check_availability`

<!-- @trace
source: implement-gemini-and-copilot-providers
updated: 2026-03-28
code:
  - apps/desktop/src-tauri/src/providers/mod.rs
  - apps/desktop/src-tauri/src/engine.rs
  - apps/desktop/src-tauri/Cargo.toml
  - apps/desktop/src/App.tsx
  - apps/desktop/src-tauri/src/providers/gemini.rs
  - apps/desktop/src-tauri/src/lib.rs
  - apps/desktop/src-tauri/src/providers/cursor.rs
  - apps/desktop/src/types/bindings.ts
  - apps/desktop/src-tauri/src/providers/copilot.rs
-->