## Summary

Consolidate the architectural core by moving orchestration logic into `packages/core`, removing redundant applications, and simplifying environment configuration.

## Motivation

Following the transition to a unified `apps/relay-service`, the standalone apps (`apps/discord-bot`, `apps/github-bot`) and the `packages/relay-context` package became redundant. Furthermore, the explicit `WORKSPACE` path management added unnecessary complexity for modern containerized (Docker) environments. Consolidating logic into `core` and using a single entry point simplifies deployment and maintenance.

## What Changes

- **MOVE**: Orchestration logic (Provider selection, context factory) moved from `packages/relay-context` to `apps/relay-service/src/context.ts`.
- **REMOVAL**: Deleted `packages/relay-context`.
- **REMOVAL**: Deleted legacy standalone apps `apps/discord-bot` and `apps/github-bot`.
- **SIMPLIFICATION**: Removed `WORKSPACE_*` environment variables and explicit workspace path passing; providers now default to `process.cwd()`.
- **UNIFICATION**: `apps/relay-service` is the sole deployment target, driven by `RELAY_PLATFORMS`.

## Capabilities

### New Capabilities

- `core-composition`: The core package now provides centralized orchestration types (`RelayContext`) and supports Dependency Injection for platforms.
- `relay-service`: Unified entry point that manages multiple platform integrations (Discord, GitHub, Slack) through configuration.

### Modified Capabilities

(none)

## Impact

- **Affected code**:
  - `packages/relay-context/` (deleted)
  - `apps/discord-bot/`, `apps/github-bot/` (deleted)
  - `packages/core/` (orchestration types added)
  - `packages/platform/*` (updated to use DI and remove workspace-config)
  - `apps/relay-service/` (composition root implemented)
  - `pnpm-workspace.yaml`, `.env.example` (simplified)
