# core-composition Specification

## Purpose

TBD - created by archiving change 'consolidate-core-and-apps'. Update Purpose after archive.

## Requirements

### Requirement: Centralized orchestration types
The core package SHALL provide standardized types for LLM orchestration, including `RelayContext` and `CreateChatProvider`, to enable decoupled communication between the composition root and platforms.

#### Scenario: Platform uses core types
- **WHEN** a platform implementation is initialized
- **THEN** it SHALL use the `RelayContext` interface provided by `@agent-relay/core`.


<!-- @trace
source: consolidate-core-and-apps
updated: 2026-03-08
code:
  - packages/relay-context/src/config.ts
  - apps/discord-bot/vitest.config.ts
  - apps/github-bot/tsup.config.ts
  - packages/platform/github/tsup.config.ts
  - apps/discord-bot/src/deploy-commands.ts
  - package.json
  - packages/platform/discord/package.json
  - apps/github-bot/vitest.config.ts
  - apps/github-bot/src/relay.ts
  - apps/github-bot/README.md
  - packages/platform/github/src/verify.ts
  - apps/github-bot/tsconfig.json
  - apps/github-bot/src/server.ts
  - apps/discord-bot/tsconfig.json
  - pnpm-workspace.yaml
  - apps/discord-bot/src/index.ts
  - apps/github-bot/src/trigger.ts
  - packages/platform/github/tsconfig.json
  - packages/platform/discord/src/deploy-commands.ts
  - apps/github-bot/src/config.ts
  - apps/discord-bot/src/config.ts
  - apps/discord-bot/src/commands/create-chat.ts
  - apps/discord-bot/tsup.config.ts
  - apps/discord-bot/src/workspace-config.ts
  - packages/platform/discord/src/commands/index.ts
  - packages/platform/discord/tsconfig.json
  - packages/platform/discord/tsup.config.ts
  - apps/relay-service/src/loader.ts
  - packages/relay-context/tsup.config.ts
  - packages/platform/discord/src/rate-limit.ts
  - packages/relay-context/tsconfig.json
  - apps/relay-service/tsconfig.json
  - packages/platform/discord/src/platform.ts
  - apps/discord-bot/src/thread-session-store.ts
  - apps/discord-bot/src/commands/index.ts
  - apps/discord-bot/package.json
  - .env.example
  - packages/platform/github/src/payload.ts
  - apps/relay-service/src/index.ts
  - packages/relay-context/package.json
  - packages/platform/github/src/platform.ts
  - apps/relay-service/package.json
  - packages/platform/discord/src/index.ts
  - apps/github-bot/src/index.ts
  - packages/platform/github/src/trigger.ts
  - packages/platform/discord/src/config.ts
  - apps/github-bot/src/rate-limit.ts
  - packages/platform/github/src/relay.ts
  - apps/github-bot/package.json
  - apps/github-bot/src/github.ts
  - packages/platform/github/src/github.ts
  - apps/github-bot/src/verify.ts
  - apps/relay-service/src/context.ts
  - packages/platform/github/src/config.ts
  - apps/discord-bot/src/rate-limit.ts
  - packages/platform/github/src/rate-limit.ts
  - packages/platform/github/src/index.ts
  - packages/platform/github/src/server.ts
  - apps/relay-service/tsup.config.ts
  - packages/platform/discord/src/commands/create-chat.ts
  - packages/relay-context/src/index.ts
  - packages/core/src/types.ts
  - packages/core/src/index.ts
  - packages/platform/discord/src/thread-session-store.ts
  - packages/provider/cursor-cli/src/provider.ts
  - packages/relay-context/src/relay-context.ts
  - README.md
  - packages/platform/github/package.json
  - apps/github-bot/src/payload.ts
tests:
  - apps/discord-bot/src/thread-session-store.test.ts
  - packages/platform/github/src/rate-limit.test.ts
  - packages/platform/github/src/relay.test.ts
  - packages/relay-context/src/relay-context.test.ts
  - apps/relay-service/src/__tests__/integration.test.ts
  - packages/relay-context/src/config.test.ts
  - apps/github-bot/src/trigger.test.ts
  - apps/github-bot/src/relay.test.ts
  - apps/github-bot/src/verify.test.ts
  - packages/platform/discord/src/thread-session-store.test.ts
  - packages/platform/github/src/verify.test.ts
  - packages/platform/github/src/trigger.test.ts
  - apps/github-bot/src/rate-limit.test.ts
-->

---
### Requirement: Dependency Injection for Platforms
The `Platform` interface SHALL support dependency injection by accepting a `RelayContext` during initialization.

#### Scenario: Platform receives dependencies
- **WHEN** the service initializes a platform
- **THEN** it SHALL pass a fully-constructed `RelayContext` to the platform's `init()` method.

<!-- @trace
source: consolidate-core-and-apps
updated: 2026-03-08
code:
  - packages/relay-context/src/config.ts
  - apps/discord-bot/vitest.config.ts
  - apps/github-bot/tsup.config.ts
  - packages/platform/github/tsup.config.ts
  - apps/discord-bot/src/deploy-commands.ts
  - package.json
  - packages/platform/discord/package.json
  - apps/github-bot/vitest.config.ts
  - apps/github-bot/src/relay.ts
  - apps/github-bot/README.md
  - packages/platform/github/src/verify.ts
  - apps/github-bot/tsconfig.json
  - apps/github-bot/src/server.ts
  - apps/discord-bot/tsconfig.json
  - pnpm-workspace.yaml
  - apps/discord-bot/src/index.ts
  - apps/github-bot/src/trigger.ts
  - packages/platform/github/tsconfig.json
  - packages/platform/discord/src/deploy-commands.ts
  - apps/github-bot/src/config.ts
  - apps/discord-bot/src/config.ts
  - apps/discord-bot/src/commands/create-chat.ts
  - apps/discord-bot/tsup.config.ts
  - apps/discord-bot/src/workspace-config.ts
  - packages/platform/discord/src/commands/index.ts
  - packages/platform/discord/tsconfig.json
  - packages/platform/discord/tsup.config.ts
  - apps/relay-service/src/loader.ts
  - packages/relay-context/tsup.config.ts
  - packages/platform/discord/src/rate-limit.ts
  - packages/relay-context/tsconfig.json
  - apps/relay-service/tsconfig.json
  - packages/platform/discord/src/platform.ts
  - apps/discord-bot/src/thread-session-store.ts
  - apps/discord-bot/src/commands/index.ts
  - apps/discord-bot/package.json
  - .env.example
  - packages/platform/github/src/payload.ts
  - apps/relay-service/src/index.ts
  - packages/relay-context/package.json
  - packages/platform/github/src/platform.ts
  - apps/relay-service/package.json
  - packages/platform/discord/src/index.ts
  - apps/github-bot/src/index.ts
  - packages/platform/github/src/trigger.ts
  - packages/platform/discord/src/config.ts
  - apps/github-bot/src/rate-limit.ts
  - packages/platform/github/src/relay.ts
  - apps/github-bot/package.json
  - apps/github-bot/src/github.ts
  - packages/platform/github/src/github.ts
  - apps/github-bot/src/verify.ts
  - apps/relay-service/src/context.ts
  - packages/platform/github/src/config.ts
  - apps/discord-bot/src/rate-limit.ts
  - packages/platform/github/src/rate-limit.ts
  - packages/platform/github/src/index.ts
  - packages/platform/github/src/server.ts
  - apps/relay-service/tsup.config.ts
  - packages/platform/discord/src/commands/create-chat.ts
  - packages/relay-context/src/index.ts
  - packages/core/src/types.ts
  - packages/core/src/index.ts
  - packages/platform/discord/src/thread-session-store.ts
  - packages/provider/cursor-cli/src/provider.ts
  - packages/relay-context/src/relay-context.ts
  - README.md
  - packages/platform/github/package.json
  - apps/github-bot/src/payload.ts
tests:
  - apps/discord-bot/src/thread-session-store.test.ts
  - packages/platform/github/src/rate-limit.test.ts
  - packages/platform/github/src/relay.test.ts
  - packages/relay-context/src/relay-context.test.ts
  - apps/relay-service/src/__tests__/integration.test.ts
  - packages/relay-context/src/config.test.ts
  - apps/github-bot/src/trigger.test.ts
  - apps/github-bot/src/relay.test.ts
  - apps/github-bot/src/verify.test.ts
  - packages/platform/discord/src/thread-session-store.test.ts
  - packages/platform/github/src/verify.test.ts
  - packages/platform/github/src/trigger.test.ts
  - apps/github-bot/src/rate-limit.test.ts
-->