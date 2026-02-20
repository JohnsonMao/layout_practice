# Design: cursor-cli-provider-agent-commands

## Context

- **Current state**: RelayRequest has `workspace` and `sessionId`. The cursor-cli provider passes `request.workspace` as `--workspace` to the CLI and as spawn cwd. Resume (sessionId → `--resume`) is already implemented. There is no create-chat or list-models API on the provider.
- **Stakeholders**: Platforms (Discord bot) that need workspace-scoped runs, session creation, and model discovery; core defines the request shape; provider implements CLI invocation.
- **Constraints**: Core stays provider-agnostic (only types); provider depends on core; no new packages.

## Goals / Non-Goals

**Goals:**

- Single source for agent working directory: require `workspace` on RelayRequest; use it for both CLI `--workspace` and spawn `cwd`.
- Add `createChat(workspace?)` and `listModels()` to the provider and export a `CursorCliProvider` interface.

**Non-Goals:**

- Changing relay.run/runStream signatures; core requires `workspace` on RelayRequest.
- Adding login/logout or MCP management to the provider.

## Decisions

1. **Workspace required**
   - **Decision**: RelayRequest has required `workspace: string`; provider uses `request.workspace` for both `--workspace` and spawn `cwd`.
   - **Rationale**: One field aligned with CLI flag name; avoids drift between CLI and process cwd.

2. **createChat / listModels on provider only**
   - **Decision**: Add `createChat(workspace?)` and `listModels()` to the object returned by `createCursorCliProvider`; type as `CursorCliProvider` extending `StreamingProvider`. Do not add these to core relay types.
   - **Rationale**: These are cursor-cli-specific subcommands; core relay stays provider-agnostic. Callers that need them use the provider instance (e.g. Discord bot) and can cast or use the typed provider.

3. **create-chat and models CLI invocation**
   - **Decision**: Use a shared `runCli(args, { timeoutMs, cwd? })` helper that spawns `agent` with the given args, collects stdout/stderr, and returns on close. createChat uses `['create-chat', ...(workspace ? ['--workspace', workspace] : [])]` and returns stdout.trim() as chatId. listModels uses `['models']` and parses stdout: skip "Available models" line, then for each line take the segment before " - " as model ID.
   - **Rationale**: Matches observed CLI output; keeps timeout and ENOENT handling in one place.

4. **createChat/listModels errors**
   - **Decision**: createChat and listModels throw on non-zero exit or empty chatId; no RelayResponse shape. Callers catch and handle.
   - **Rationale**: They are not relay request/response flows; throwing keeps the API simple.

## Risks / Trade-offs

- **Risk**: CLI output format for `agent models` or `agent create-chat` may change in future CLI versions.  
  **Mitigation**: Parse defensively (trim, skip header); document that listModels returns "best effort" model IDs. create-chat output is a single line (UUID); if CLI adds JSON, we can add a branch to parse it.

- **Trade-off**: createChat/listModels are not on a generic Provider interface, so code that only has a StreamingProvider cannot call them without a type assertion.  
  **Acceptable**: Only cursor-cli needs these; platforms that use cursor-cli can depend on CursorCliProvider.

## Migration Plan

- Deploy: RelayRequest requires `workspace`; deploy provider with createChat, listModels. Callers must pass workspace.
- Rollback: revert to previous request shape if needed.

## Open Questions

- None for this change.
