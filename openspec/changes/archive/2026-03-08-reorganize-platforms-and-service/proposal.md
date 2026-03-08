## Summary

Reorganize platform-specific logic (Discord, GitHub) from `apps/` into `packages/platform/*` and create a unified `apps/relay-service` for deployment.

## Motivation

Current architecture places platform-specific logic directly in `apps/`, leading to duplication of boilerplate and making it difficult to maintain a unified deployment strategy. Moving platform logic to packages enables:
- **Reusability**: Better abstraction of platform-specific handlers.
- **Unified Service**: A single entry point (`apps/relay-service`) that can manage multiple platforms via configuration.
- **Tree-shaking/Optimization**: Ability to build specialized Docker images with only the necessary platforms and providers.
- **Scalability**: Easier to add new platforms (like Slack) by following a established package pattern.

## Proposed Solution

1.  **Extract Platform Packages**:
    - Move logic from `apps/discord-bot` to `packages/platform/discord`.
    - Move logic from `apps/github-bot` to `packages/platform/github`.
    - Future `slack-bot` will be implemented as `packages/platform/slack`.
2.  **Create Unified Service**:
    - Add `apps/relay-service` as the primary application entry point.
    - Implement a configuration-driven loader that initializes active platforms based on environment variables.
3.  **Refactor Dependencies**:
    - `apps/relay-service` will depend on `packages/platform/*` as needed.
    - Ensure `packages/core` remains platform-agnostic.

## Capabilities

### New Capabilities

- `relay-service`: Unified entry point that manages multiple platform integrations (Discord, GitHub, Slack) through configuration.

### Modified Capabilities

(none)

## Impact

- **Affected specs**:
  - `platform-discord`: No requirement changes, only structural refactoring.
  - `platform-github`: No requirement changes.
- **Affected code**:
  - `apps/discord-bot/` (to be removed or simplified)
  - `apps/github-bot/` (to be removed or simplified)
  - `packages/platform/discord/` (new)
  - `packages/platform/github/` (new)
  - `apps/relay-service/` (new)
  - `package.json`, `pnpm-workspace.yaml`, `turbo.json` (workspace updates)
