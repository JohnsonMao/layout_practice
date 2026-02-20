# Spec: provider-cursor-cli

## Purpose

Wrap the Cursor CLI in non-interactive mode: spawn the agent with the relay request prompt and options, parse JSON or raw output, return the relay response. Handle timeout and CLI-not-found errors.

## Requirements

### Requirement: Execute via Cursor CLI non-interactive mode

The provider SHALL execute user prompts by invoking the Cursor CLI in non-interactive mode (e.g. `agent -p "<prompt>"`). The provider MUST NOT depend on interactive stdin; it SHALL use the print/automation interface only. The provider SHALL require request.workspace. The provider SHALL pass request.workspace as `--workspace` to the CLI and SHALL use it as the spawn process cwd.

#### Scenario: Successful execution

- **WHEN** the provider receives a valid request and the Cursor CLI is installed and available
- **THEN** the provider SHALL spawn the CLI with the request prompt and SHALL return success with the CLI stdout as the result (after parsing if using structured output)

#### Scenario: CLI not found

- **WHEN** the Cursor CLI binary is not in PATH or not installed
- **THEN** the provider SHALL return an error response with a code such as CURSOR_CLI_NOT_FOUND and a message indicating the user should install the CLI

#### Scenario: workspace passed to CLI and spawn

- **WHEN** execute or executeStream is called with a request
- **THEN** the provider SHALL invoke the CLI with `--workspace <request.workspace>` and SHALL spawn the process with `cwd: request.workspace`

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

### Requirement: Streaming execution

The cursor-cli provider SHALL implement StreamingProvider by providing executeStream(request) that runs the CLI with stream-json output and yields StreamChunk values.

#### Scenario: Invoke CLI with stream-json

- **WHEN** executeStream(request) is called
- **THEN** the provider SHALL spawn the agent CLI with arguments including --output-format stream-json and the request prompt and options

#### Scenario: Parse NDJSON and yield text

- **WHEN** the CLI stdout emits a line that parses as JSON with type "assistant" and content/text
- **THEN** the provider SHALL yield a StreamChunk of type "text" with that content

#### Scenario: Parse and yield tool_call

- **WHEN** the CLI stdout emits a line that parses as JSON with type "tool_call"
- **THEN** the provider SHALL yield a StreamChunk of type "tool_call" (ToolCallStreamChunk) with toolName (from the tool key, e.g. shellToolCall), isCompleted (true when subtype is "completed"), and isRejected (true when result.rejected is present)

#### Scenario: Process exit

- **WHEN** the child process exits with code 0
- **THEN** the provider SHALL yield a StreamChunk of type "done"

#### Scenario: Process error or non-zero exit

- **WHEN** the child process errors (e.g. ENOENT) or exits non-zero
- **THEN** the provider SHALL yield a StreamChunk of type "error" with appropriate code and message

### Requirement: Create chat

The provider SHALL expose createChat(workspace?: string) that invokes the Cursor CLI subcommand `agent create-chat` and returns the new chat ID. When workspace is provided and non-empty, the provider SHALL pass `--workspace <workspace>` to the CLI and SHALL use that path as the spawn process cwd.

#### Scenario: Create chat without workspace

- **WHEN** createChat() is called with no argument or empty workspace
- **THEN** the provider SHALL spawn `agent create-chat` without --workspace and SHALL return the stdout (trimmed) as chatId

#### Scenario: Create chat with workspace

- **WHEN** createChat(workspace) is called with a non-empty workspace path
- **THEN** the provider SHALL spawn `agent create-chat --workspace <workspace>` with spawn cwd set to workspace and SHALL return the stdout (trimmed) as chatId

#### Scenario: Create chat failure

- **WHEN** the create-chat process exits non-zero or stdout is empty
- **THEN** the provider SHALL throw an error with a message derived from stderr or exit code

### Requirement: List models

The provider SHALL expose listModels() that invokes the Cursor CLI subcommand `agent models` and returns an array of model IDs (strings). The provider SHALL parse the CLI stdout: skip a header line such as "Available models", and for each subsequent line SHALL take the segment before the first " - " as the model ID.

#### Scenario: List models success

- **WHEN** listModels() is called and the CLI exits with code 0
- **THEN** the provider SHALL return an array of non-empty model ID strings parsed from stdout

#### Scenario: List models failure

- **WHEN** the models process exits non-zero
- **THEN** the provider SHALL throw an error with a message derived from stderr or exit code
