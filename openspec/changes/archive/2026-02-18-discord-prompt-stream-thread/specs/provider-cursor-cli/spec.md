# Delta Spec: provider-cursor-cli (discord-prompt-stream-thread)

## ADDED Requirements

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
- **THEN** the provider SHALL yield a StreamChunk of type "tool_call" with toolCallId, name, and args as available

#### Scenario: Process exit

- **WHEN** the child process exits with code 0
- **THEN** the provider SHALL yield a StreamChunk of type "done"

#### Scenario: Process error or non-zero exit

- **WHEN** the child process errors (e.g. ENOENT) or exits non-zero
- **THEN** the provider SHALL yield a StreamChunk of type "error" with appropriate code and message
