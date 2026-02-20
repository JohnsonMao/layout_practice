# Delta Spec: provider-cursor-cli

## MODIFIED Requirements

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

## ADDED Requirements

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
