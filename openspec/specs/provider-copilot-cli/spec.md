# provider-copilot-cli Specification

## Purpose

TBD - created by archiving change 'implement-gemini-and-copilot-providers'. Update Purpose after archive.

## Requirements

### Requirement: Execute via GitHub CLI Copilot
The provider SHALL execute prompts by invoking the `gh copilot` command. It SHALL support subcommands such as `suggest` or `explain` based on the user intent.

#### Scenario: Successful suggestion
- **WHEN** the provider invokes `gh copilot suggest` with a prompt
- **THEN** the provider SHALL return the suggested command or explanation as text


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
### Requirement: Output parsing and fallback
The provider SHALL attempt to parse `gh copilot` output as JSON if available. If the output is plain text, the provider SHALL wrap it in a `RelayEvent::Text`.

#### Scenario: Fallback to plain text
- **WHEN** the CLI returns non-JSON output
- **THEN** the provider SHALL emit a `RelayEvent::Text` containing the raw output


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
### Requirement: Authentication and availability
The provider SHALL verify that the `gh` binary is installed and the `copilot` extension is authenticated.

#### Scenario: gh command missing
- **WHEN** the `gh` command is not in the system PATH
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