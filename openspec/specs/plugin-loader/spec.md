# plugin-loader Specification

## Purpose

TBD - created by archiving change 'refactor-provider-registry'. Update Purpose after archive.

## Requirements

### Requirement: Plugin Loader Configuration
The system SHALL support a `registry.config.ts` file to statically define enabled plugins.

#### Scenario: Loading plugins from config
- **WHEN** the application starts
- **THEN** the loader reads `registry.config.ts`
- **THEN** it registers all providers and platforms defined therein


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
### Requirement: Automatic Plugin Discovery
The system SHALL support automatic discovery of plugin packages in the workspace when the config is missing.

#### Scenario: Discovering plugins automatically
- **WHEN** `registry.config.ts` is absent
- **THEN** the system scans the `packages/` directory for plugins
- **THEN** it dynamically loads all discovered plugins

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