# Proposal: cursor-cli-provider-agent-commands

## Why

Platforms (e.g. Discord) need a single workspace path for the agent (both CLI `--workspace` and process cwd), plus the ability to create chats and list models. Resume is already implemented; this change adds workspace as the single source of truth and extends the provider with create-chat and models so relay/apps can create sessions and discover models without calling the CLI ad hoc.

## Goals

- Use one field (workspace) for both CLI `--workspace` and spawn cwd.
- Add create-chat and list-models to the cursor-cli provider so platforms can create sessions and list models via the provider.

## Non-Goals

- Changing core relay interface beyond requiring `workspace` on RelayRequest.
- Implementing login/logout or MCP management in the provider.

## What Changes

- **Core**: Require `workspace` on `RelayRequest`; doc that it is the workspace path passed as `--workspace` to CLI and used as spawn cwd.
- **Provider**: Use `request.workspace` for both CLI `--workspace` and spawn `cwd`.
- **Provider**: Add `createChat(workspace?: string): Promise<{ chatId: string }>` (invoke `agent create-chat`, optional `--workspace`).
- **Provider**: Add `listModels(): Promise<string[]>` (invoke `agent models`, parse stdout for model IDs).
- **Provider**: Export `CursorCliProvider` interface extending `StreamingProvider` with `createChat` and `listModels`.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- **provider-cursor-cli**: Add requirement for workspace as single source for CLI and spawn; add requirements for create-chat and list-models provider methods.

## Impact

- `packages/core/src/types.ts`: RelayRequest has required `workspace: string`.
- `packages/provider/cursor-cli`: buildArgs/buildStreamArgs and spawn use `request.workspace`; new `createChat`, `listModels`, and `CursorCliProvider` type; export from index.
