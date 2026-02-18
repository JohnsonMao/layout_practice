# Spec: provider-cursor-cli

## Purpose

Wrap the Cursor CLI in non-interactive mode: spawn the agent with the relay request prompt and options, parse JSON or raw output, return the relay response. Handle timeout and CLI-not-found errors.

## Requirements

### Requirement: Execute via Cursor CLI non-interactive mode

The provider SHALL execute user prompts by invoking the Cursor CLI in non-interactive mode (e.g. `agent -p "<prompt>"`). The provider MUST NOT depend on interactive stdin; it SHALL use the print/automation interface only.

#### Scenario: Successful execution

- **WHEN** the provider receives a valid request and the Cursor CLI is installed and available
- **THEN** the provider SHALL spawn the CLI with the request prompt and SHALL return success with the CLI stdout as the result (after parsing if using structured output)

#### Scenario: CLI not found

- **WHEN** the Cursor CLI binary is not in PATH or not installed
- **THEN** the provider SHALL return an error response with a code such as CURSOR_CLI_NOT_FOUND and a message indicating the user should install the CLI

### Requirement: Output format handling

The provider SHALL request CLI output in a parseable format (e.g. `--output-format json`) when supported. If the CLI returns non-JSON or the format is unsupported, the provider SHALL treat the raw stdout as the result string.

#### Scenario: JSON output

- **WHEN** the CLI is invoked with `--output-format json` and returns valid JSON
- **THEN** the provider SHALL extract the result content from the JSON and return it in the relay result field

#### Scenario: Fallback to raw text

- **WHEN** the CLI returns plain text or invalid JSON
- **THEN** the provider SHALL return the raw stdout as the result string so the relay still returns a usable response

### Requirement: Optional model and mode

The provider SHALL pass through optional `model` and `mode` from the relay request to the Cursor CLI when present (e.g. `--model`, `--mode=plan`). The provider MAY ignore unsupported values and use CLI defaults.

#### Scenario: With model and mode

- **WHEN** the request includes `options: { model: "gpt-5.2", mode: "plan" }`
- **THEN** the provider SHALL invoke the CLI with the corresponding flags so the CLI uses that model and mode

#### Scenario: Without options

- **WHEN** the request has no options
- **THEN** the provider SHALL invoke the CLI without model or mode flags so the CLI uses its defaults

### Requirement: Timeout and failure handling

The provider SHALL enforce a configurable timeout for CLI execution. If the CLI exits with a non-zero code or times out, the provider SHALL return an error response with an appropriate code and message.

#### Scenario: CLI non-zero exit

- **WHEN** the Cursor CLI process exits with a non-zero code
- **THEN** the provider SHALL return an error response including the exit code or a mapped error code and the stderr or a summary message

#### Scenario: Timeout

- **WHEN** the CLI does not complete within the configured timeout
- **THEN** the provider SHALL terminate the process and return an error response with a timeout error code
