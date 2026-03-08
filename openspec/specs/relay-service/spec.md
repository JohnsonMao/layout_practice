# relay-service Specification

## Purpose

TBD - created by archiving change 'reorganize-platforms-and-service'. Update Purpose after archive.

## Requirements

### Requirement: Unified service entry point
The `relay-service` SHALL provide a unified entry point that can initialize and run multiple platform integrations (Discord, GitHub, Slack) based on environment configuration.

#### Scenario: Start with multiple platforms
- **WHEN** the `RELAY_PLATFORMS` environment variable is set to `discord,github` and the service is started
- **THEN** the service SHALL initialize both `platform-discord` and `platform-github` handlers and SHALL start listening for events from both platforms


<!-- @trace
source: reorganize-platforms-and-service
updated: 2026-03-08
code:
  - packages/platform/discord/package.json
  - packages/relay-context/package.json
  - packages/platform/discord/tsup.config.ts
  - packages/relay-context/src/config.ts
  - apps/relay-service/package.json
  - packages/platform/github/package.json
  - packages/platform/github/src/github.ts
  - packages/platform/github/src/payload.ts
  - apps/discord-bot/src/deploy-commands.ts
  - apps/discord-bot/src/rate-limit.ts
  - README.md
  - package.json
  - apps/github-bot/tsconfig.json
  - packages/platform/discord/src/index.ts
  - packages/platform/discord/tsconfig.json
  - apps/discord-bot/package.json
  - packages/platform/github/src/config.ts
  - packages/platform/github/src/trigger.ts
  - packages/platform/github/tsconfig.json
  - apps/discord-bot/src/workspace-config.ts
  - packages/platform/github/tsup.config.ts
  - apps/discord-bot/tsup.config.ts
  - apps/discord-bot/src/commands/index.ts
  - packages/core/src/index.ts
  - packages/platform/discord/src/deploy-commands.ts
  - apps/github-bot/src/verify.ts
  - packages/platform/github/src/verify.ts
  - packages/platform/discord/src/commands/create-chat.ts
  - packages/relay-context/src/relay-context.ts
  - apps/github-bot/src/github.ts
  - packages/platform/github/src/server.ts
  - pnpm-workspace.yaml
  - packages/platform/github/src/index.ts
  - apps/github-bot/tsup.config.ts
  - apps/github-bot/src/index.ts
  - apps/relay-service/src/index.ts
  - apps/discord-bot/src/thread-session-store.ts
  - packages/platform/discord/src/thread-session-store.ts
  - packages/relay-context/tsup.config.ts
  - apps/relay-service/src/loader.ts
  - packages/platform/discord/src/rate-limit.ts
  - .env.example
  - apps/discord-bot/src/commands/create-chat.ts
  - apps/relay-service/src/context.ts
  - apps/relay-service/tsup.config.ts
  - packages/platform/github/src/platform.ts
  - apps/discord-bot/src/config.ts
  - apps/github-bot/package.json
  - packages/relay-context/tsconfig.json
  - apps/github-bot/src/config.ts
  - apps/github-bot/src/rate-limit.ts
  - apps/github-bot/README.md
  - packages/platform/github/src/rate-limit.ts
  - apps/github-bot/src/payload.ts
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/src/provider.ts
  - apps/github-bot/src/relay.ts
  - packages/platform/github/src/relay.ts
  - packages/core/src/types.ts
  - packages/relay-context/src/index.ts
  - packages/platform/discord/src/platform.ts
  - apps/discord-bot/src/index.ts
  - apps/discord-bot/vitest.config.ts
  - apps/github-bot/src/server.ts
  - packages/platform/discord/src/config.ts
  - packages/platform/discord/src/commands/index.ts
  - apps/github-bot/src/trigger.ts
  - apps/discord-bot/tsconfig.json
  - apps/github-bot/vitest.config.ts
tests:
  - packages/platform/github/src/relay.test.ts
  - packages/platform/discord/src/thread-session-store.test.ts
  - packages/platform/github/src/trigger.test.ts
  - packages/platform/github/src/verify.test.ts
  - packages/relay-context/src/relay-context.test.ts
  - apps/github-bot/src/verify.test.ts
  - apps/github-bot/src/rate-limit.test.ts
  - apps/discord-bot/src/thread-session-store.test.ts
  - apps/relay-service/src/__tests__/integration.test.ts
  - apps/github-bot/src/relay.test.ts
  - packages/platform/github/src/rate-limit.test.ts
  - packages/relay-context/src/config.test.ts
  - apps/github-bot/src/trigger.test.ts
-->

---
### Requirement: Configuration-driven platform loading
The service SHALL dynamically load only the platforms specified in the configuration. It MUST NOT start or initialize any platform that is not explicitly enabled.

#### Scenario: Only specified platform starts
- **WHEN** `RELAY_PLATFORMS` is set to `discord` and the service is started
- **THEN** the service SHALL initialize `platform-discord` and SHALL NOT initialize `platform-github` or any other platform


<!-- @trace
source: reorganize-platforms-and-service
updated: 2026-03-08
code:
  - packages/platform/discord/package.json
  - packages/relay-context/package.json
  - packages/platform/discord/tsup.config.ts
  - packages/relay-context/src/config.ts
  - apps/relay-service/package.json
  - packages/platform/github/package.json
  - packages/platform/github/src/github.ts
  - packages/platform/github/src/payload.ts
  - apps/discord-bot/src/deploy-commands.ts
  - apps/discord-bot/src/rate-limit.ts
  - README.md
  - package.json
  - apps/github-bot/tsconfig.json
  - packages/platform/discord/src/index.ts
  - packages/platform/discord/tsconfig.json
  - apps/discord-bot/package.json
  - packages/platform/github/src/config.ts
  - packages/platform/github/src/trigger.ts
  - packages/platform/github/tsconfig.json
  - apps/discord-bot/src/workspace-config.ts
  - packages/platform/github/tsup.config.ts
  - apps/discord-bot/tsup.config.ts
  - apps/discord-bot/src/commands/index.ts
  - packages/core/src/index.ts
  - packages/platform/discord/src/deploy-commands.ts
  - apps/github-bot/src/verify.ts
  - packages/platform/github/src/verify.ts
  - packages/platform/discord/src/commands/create-chat.ts
  - packages/relay-context/src/relay-context.ts
  - apps/github-bot/src/github.ts
  - packages/platform/github/src/server.ts
  - pnpm-workspace.yaml
  - packages/platform/github/src/index.ts
  - apps/github-bot/tsup.config.ts
  - apps/github-bot/src/index.ts
  - apps/relay-service/src/index.ts
  - apps/discord-bot/src/thread-session-store.ts
  - packages/platform/discord/src/thread-session-store.ts
  - packages/relay-context/tsup.config.ts
  - apps/relay-service/src/loader.ts
  - packages/platform/discord/src/rate-limit.ts
  - .env.example
  - apps/discord-bot/src/commands/create-chat.ts
  - apps/relay-service/src/context.ts
  - apps/relay-service/tsup.config.ts
  - packages/platform/github/src/platform.ts
  - apps/discord-bot/src/config.ts
  - apps/github-bot/package.json
  - packages/relay-context/tsconfig.json
  - apps/github-bot/src/config.ts
  - apps/github-bot/src/rate-limit.ts
  - apps/github-bot/README.md
  - packages/platform/github/src/rate-limit.ts
  - apps/github-bot/src/payload.ts
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/src/provider.ts
  - apps/github-bot/src/relay.ts
  - packages/platform/github/src/relay.ts
  - packages/core/src/types.ts
  - packages/relay-context/src/index.ts
  - packages/platform/discord/src/platform.ts
  - apps/discord-bot/src/index.ts
  - apps/discord-bot/vitest.config.ts
  - apps/github-bot/src/server.ts
  - packages/platform/discord/src/config.ts
  - packages/platform/discord/src/commands/index.ts
  - apps/github-bot/src/trigger.ts
  - apps/discord-bot/tsconfig.json
  - apps/github-bot/vitest.config.ts
tests:
  - packages/platform/github/src/relay.test.ts
  - packages/platform/discord/src/thread-session-store.test.ts
  - packages/platform/github/src/trigger.test.ts
  - packages/platform/github/src/verify.test.ts
  - packages/relay-context/src/relay-context.test.ts
  - apps/github-bot/src/verify.test.ts
  - apps/github-bot/src/rate-limit.test.ts
  - apps/discord-bot/src/thread-session-store.test.ts
  - apps/relay-service/src/__tests__/integration.test.ts
  - apps/github-bot/src/relay.test.ts
  - packages/platform/github/src/rate-limit.test.ts
  - packages/relay-context/src/config.test.ts
  - apps/github-bot/src/trigger.test.ts
-->

---
### Requirement: Graceful startup and failure
The service SHALL provide clear feedback if an enabled platform fails to initialize (e.g., due to missing configuration or network errors) and MUST NOT start listening if any required configuration for enabled platforms is missing.

#### Scenario: Fail fast on missing config
- **WHEN** `RELAY_PLATFORMS` includes `discord` but `DISCORD_TOKEN` is missing
- **THEN** the service SHALL log a descriptive error and SHALL exit with a non-zero exit code

<!-- @trace
source: reorganize-platforms-and-service
updated: 2026-03-08
code:
  - packages/platform/discord/package.json
  - packages/relay-context/package.json
  - packages/platform/discord/tsup.config.ts
  - packages/relay-context/src/config.ts
  - apps/relay-service/package.json
  - packages/platform/github/package.json
  - packages/platform/github/src/github.ts
  - packages/platform/github/src/payload.ts
  - apps/discord-bot/src/deploy-commands.ts
  - apps/discord-bot/src/rate-limit.ts
  - README.md
  - package.json
  - apps/github-bot/tsconfig.json
  - packages/platform/discord/src/index.ts
  - packages/platform/discord/tsconfig.json
  - apps/discord-bot/package.json
  - packages/platform/github/src/config.ts
  - packages/platform/github/src/trigger.ts
  - packages/platform/github/tsconfig.json
  - apps/discord-bot/src/workspace-config.ts
  - packages/platform/github/tsup.config.ts
  - apps/discord-bot/tsup.config.ts
  - apps/discord-bot/src/commands/index.ts
  - packages/core/src/index.ts
  - packages/platform/discord/src/deploy-commands.ts
  - apps/github-bot/src/verify.ts
  - packages/platform/github/src/verify.ts
  - packages/platform/discord/src/commands/create-chat.ts
  - packages/relay-context/src/relay-context.ts
  - apps/github-bot/src/github.ts
  - packages/platform/github/src/server.ts
  - pnpm-workspace.yaml
  - packages/platform/github/src/index.ts
  - apps/github-bot/tsup.config.ts
  - apps/github-bot/src/index.ts
  - apps/relay-service/src/index.ts
  - apps/discord-bot/src/thread-session-store.ts
  - packages/platform/discord/src/thread-session-store.ts
  - packages/relay-context/tsup.config.ts
  - apps/relay-service/src/loader.ts
  - packages/platform/discord/src/rate-limit.ts
  - .env.example
  - apps/discord-bot/src/commands/create-chat.ts
  - apps/relay-service/src/context.ts
  - apps/relay-service/tsup.config.ts
  - packages/platform/github/src/platform.ts
  - apps/discord-bot/src/config.ts
  - apps/github-bot/package.json
  - packages/relay-context/tsconfig.json
  - apps/github-bot/src/config.ts
  - apps/github-bot/src/rate-limit.ts
  - apps/github-bot/README.md
  - packages/platform/github/src/rate-limit.ts
  - apps/github-bot/src/payload.ts
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/src/provider.ts
  - apps/github-bot/src/relay.ts
  - packages/platform/github/src/relay.ts
  - packages/core/src/types.ts
  - packages/relay-context/src/index.ts
  - packages/platform/discord/src/platform.ts
  - apps/discord-bot/src/index.ts
  - apps/discord-bot/vitest.config.ts
  - apps/github-bot/src/server.ts
  - packages/platform/discord/src/config.ts
  - packages/platform/discord/src/commands/index.ts
  - apps/github-bot/src/trigger.ts
  - apps/discord-bot/tsconfig.json
  - apps/github-bot/vitest.config.ts
tests:
  - packages/platform/github/src/relay.test.ts
  - packages/platform/discord/src/thread-session-store.test.ts
  - packages/platform/github/src/trigger.test.ts
  - packages/platform/github/src/verify.test.ts
  - packages/relay-context/src/relay-context.test.ts
  - apps/github-bot/src/verify.test.ts
  - apps/github-bot/src/rate-limit.test.ts
  - apps/discord-bot/src/thread-session-store.test.ts
  - apps/relay-service/src/__tests__/integration.test.ts
  - apps/github-bot/src/relay.test.ts
  - packages/platform/github/src/rate-limit.test.ts
  - packages/relay-context/src/config.test.ts
  - apps/github-bot/src/trigger.test.ts
-->

---
### Requirement: Orchestration management
The `relay-service` SHALL manage the selection and instantiation of LLM providers and SHALL construct the `RelayContext` for all active platforms.

#### Scenario: Service constructs context
- **WHEN** the service starts with enabled platforms
- **THEN** it SHALL resolve the `RELAY_PROVIDER` setting, instantiate the provider, and provide the resulting context to each platform.

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