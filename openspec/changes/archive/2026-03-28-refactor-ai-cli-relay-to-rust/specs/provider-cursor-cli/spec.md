## MODIFIED Requirements

### Requirement: Execute via Cursor CLI non-interactive mode

The provider SHALL execute user prompts by invoking the Cursor CLI in non-interactive mode (e.g. `agent -p "<prompt>"`). The provider MUST NOT depend on interactive stdin; it SHALL use the print/automation interface only. The provider SHALL require request.workspace. The provider SHALL pass request.workspace as `--workspace` to the CLI and SHALL use it as the spawn process cwd.

#### Scenario: Successful execution

- **WHEN** the provider receives a valid request and the Cursor CLI is installed and available
- **THEN** the provider SHALL spawn the CLI with the request prompt and SHALL return success with the CLI stdout as the result (after parsing if using structured output)

#### Scenario: CLI not found

- **WHEN** the Cursor CLI binary is not in PATH or not installed
- **THEN** the provider SHALL return an error response with a code such as CURSOR_CLI_NOT_FOUND and a message indicating the user SHALL install the CLI

#### Scenario: workspace passed to CLI and spawn

- **WHEN** execute or executeStream is called with a request
- **THEN** the provider SHALL invoke the CLI with `--workspace <request.workspace>` and SHALL spawn the process with `cwd: request.workspace`

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

## ADDED Requirements

### Requirement: Rust Implementation Support
The system SHALL support a Rust native implementation of the Cursor CLI provider for the desktop application backend, fulfilling the same streaming and execution requirements as the TypeScript provider.

#### Scenario: Rust execution
- **WHEN** the Tauri backend invokes the Rust `CursorProvider`
- **THEN** the provider SHALL spawn the CLI and parse the streaming output according to the established `RelayEvent` protocol
