# provider-registry Specification

## Purpose

TBD - created by archiving change 'refactor-provider-registry'. Update Purpose after archive.

## Requirements

### Requirement: Provider Registry Interface
The system SHALL provide a `ProviderRegistry` interface that allows dynamic registration of `RelayProvider` implementations.

#### Scenario: Registering a new provider
- **WHEN** a provider package registers itself via the Registry
- **THEN** the registry stores the provider factory
- **THEN** the relay service can retrieve the provider instance by ID


<!-- @trace
source: refactor-provider-registry
updated: 2026-03-22
code:
  - packages/platform/discord/src/platform.ts
  - packages/core/src/index.ts
  - packages/provider/cursor-cli/src/index.ts
  - apps/relay-service/package.json
  - packages/platform/github/package.json
  - packages/provider/cursor-cli/tsup.config.ts
  - packages/provider/gemini/tsup.config.ts
  - apps/relay-service/src/context.ts
  - packages/provider/copilot-sdk/package.json
  - packages/platform/discord/src/index.ts
  - packages/provider/copilot-sdk/tsup.config.ts
  - packages/platform/discord/package.json
  - packages/platform/discord/tsup.config.ts
  - packages/platform/github/src/platform.ts
  - turbo.json
  - package.json
  - apps/relay-service/src/plugin-loader.ts
  - apps/relay-service/src/loader.ts
  - packages/core/src/registry.ts
  - apps/relay-service/src/index.ts
  - packages/platform/github/tsup.config.ts
  - packages/provider/copilot-sdk/src/index.ts
  - packages/provider/gemini/src/index.ts
  - packages/provider/cursor-cli/package.json
  - packages/provider/gemini/package.json
  - packages/core/package.json
  - packages/platform/github/src/index.ts
tests:
  - apps/relay-service/src/__tests__/integration.test.ts
-->

---
### Requirement: Provider Retrieval
The system SHALL support retrieving registered providers by ID.

#### Scenario: Retrieving an existing provider
- **WHEN** the system requests a provider by a registered ID
- **THEN** the registry returns the corresponding provider factory instance

<!-- @trace
source: refactor-provider-registry
updated: 2026-03-22
code:
  - packages/platform/discord/src/platform.ts
  - packages/core/src/index.ts
  - packages/provider/cursor-cli/src/index.ts
  - apps/relay-service/package.json
  - packages/platform/github/package.json
  - packages/provider/cursor-cli/tsup.config.ts
  - packages/provider/gemini/tsup.config.ts
  - apps/relay-service/src/context.ts
  - packages/provider/copilot-sdk/package.json
  - packages/platform/discord/src/index.ts
  - packages/provider/copilot-sdk/tsup.config.ts
  - packages/platform/discord/package.json
  - packages/platform/discord/tsup.config.ts
  - packages/platform/github/src/platform.ts
  - turbo.json
  - package.json
  - apps/relay-service/src/plugin-loader.ts
  - apps/relay-service/src/loader.ts
  - packages/core/src/registry.ts
  - apps/relay-service/src/index.ts
  - packages/platform/github/tsup.config.ts
  - packages/provider/copilot-sdk/src/index.ts
  - packages/provider/gemini/src/index.ts
  - packages/provider/cursor-cli/package.json
  - packages/provider/gemini/package.json
  - packages/core/package.json
  - packages/platform/github/src/index.ts
tests:
  - apps/relay-service/src/__tests__/integration.test.ts
-->