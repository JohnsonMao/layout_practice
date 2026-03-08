# Design: Consolidate Core and Apps

## Context

The system has evolved into a platform-agnostic core. Redundant legacy apps and intermediate packages (`relay-context`) are being replaced by a single, configuration-driven application that handles multiple platforms and providers.

## Goals / Non-Goals

**Goals:**
- Eliminate `packages/relay-context` and redundant apps.
- Implement Dependency Injection for platforms.
- Centralize all orchestration and composition logic in `apps/relay-service`.
- Simplify workspace management by defaulting to the execution directory (ideal for Docker).
- Synchronize build-time tree-shaking with runtime `RELAY_PLATFORMS` configuration.

**Non-Goals:**
- Do not add new functional platform features (e.g., Slack) in this cleanup phase.

## Decisions

### 1. Orchestration via Dependency Injection

- **Decision**: Platforms (Discord, GitHub) receive a `RelayContext` during initialization (`init(ctx)`).
- **Rationale**: Decouples platforms from providers and orchestration logic.

### 2. Single Composition Root: `apps/relay-service`

- **Decision**: `apps/relay-service` is the sole entry point and handle all assembly of providers and platforms.
- **Rationale**: Standardizes deployment and simplifies configuration.

### 3. Unified Environment-Driven Tree-shaking

- **Decision**: Use `tsup.config.ts` to read `RELAY_PLATFORMS` from `.env` and define build-time constants.
- **Rationale**: Ensures the produced binary only contains code for enabled platforms, minimizing image size while maintaining a single configuration source.

### 4. Removal of Workspace Path Management

- **Decision**: Remove `WORKSPACE_*` environment variables and the `workspace-config` module.
- **Rationale**: In containerized environments, the bot executes within the relevant directory. Defaulting to `process.cwd()` is simpler and more robust.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-------------|
| **Breaking changes for manual deployments** | Document the requirement to use `relay-service` and updated `.env` format in README. |
| **Dependency Injection complexity** | Keep the `RelayContext` interface focused on essential provider access. |
