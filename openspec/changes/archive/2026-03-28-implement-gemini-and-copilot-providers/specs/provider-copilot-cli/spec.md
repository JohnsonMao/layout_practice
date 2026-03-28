## ADDED Requirements

### Requirement: Execute via GitHub CLI Copilot
The provider SHALL execute prompts by invoking the `gh copilot` command. It SHALL support subcommands such as `suggest` or `explain` based on the user intent.

#### Scenario: Successful suggestion
- **WHEN** the provider invokes `gh copilot suggest` with a prompt
- **THEN** the provider SHALL return the suggested command or explanation as text

### Requirement: Output parsing and fallback
The provider SHALL attempt to parse `gh copilot` output as JSON if available. If the output is plain text, the provider SHALL wrap it in a `RelayEvent::Text`.

#### Scenario: Fallback to plain text
- **WHEN** the CLI returns non-JSON output
- **THEN** the provider SHALL emit a `RelayEvent::Text` containing the raw output

### Requirement: Authentication and availability
The provider SHALL verify that the `gh` binary is installed and the `copilot` extension is authenticated.

#### Scenario: gh command missing
- **WHEN** the `gh` command is not in the system PATH
- **THEN** the provider SHALL return `false` for `check_availability`
