# Design: Reorganize Platforms and Service

## Context

The `agent-relay` project currently has platform-specific logic (e.g., Discord, GitHub) implemented directly within the `apps/` directory. This creates several issues:
- **Tight Coupling**: Bot implementation and application lifecycle are intertwined.
- **Low Reusability**: Platform-specific components (event handlers, message formatters) are not easily reusable as packages.
- **Deployment Rigidity**: Each bot requires its own application structure, making it harder to manage a unified service that can support multiple platforms dynamically.

The project uses a pnpm workspace with Turborepo. Core logic is in `packages/core`, and LLM provider logic is in `packages/provider/*`.

## Goals / Non-Goals

**Goals:**
- Move platform-specific logic (Discord, GitHub) to `packages/platform/discord` and `packages/platform/github`.
- Create a unified `apps/relay-service` that can initialize and run one or more platforms based on configuration.
- Standardize the interface for platform packages to simplify adding new platforms (e.g., Slack).
- Enable "Build-time configuration" (Tree-shaking) via flags if needed for specialized Docker images.

**Non-Goals:**
- Do not change existing behavior of Discord or GitHub bots.
- Do not introduce new functional features (like Slack support) in this refactor (Slack will be a subsequent task).
- Do not modify `packages/core` unless absolutely necessary for the abstraction.

## Decisions

### 1. Structure: `packages/platform/*` for Logic Extraction

- **Decision**: Extract platform-specific handlers and API interactions into dedicated packages in `packages/platform/*`.
- **Rationale**: This separates the "Bot Business Logic" from the "Application Entry Point". It follows the same pattern as `packages/provider/*`.
- **Alternatives**: Keeping everything in `apps/` but using shared utilities. This is less robust for dependency management and workspace boundaries.

### 2. Unified Entry Point: `apps/relay-service`

- **Decision**: Create a single `apps/relay-service` that acts as the composition root.
- **Rationale**: Simplifies deployment and configuration. Instead of managing multiple Docker containers for each bot, one can run a single service that manages all active platforms.
- **Implementation**: Use a factory or loader that reads environment variables (e.g., `RELAY_PLATFORMS=discord,github`) and initializes the corresponding platform packages.

### 3. Build-time Flags for Tree-shaking

- **Decision**: Use `define` in `tsup.config.ts` (or similar build-time tool) to inject constants like `ENABLE_PLATFORM_DISCORD`.
- **Rationale**: Allows the bundler to eliminate unused code when building for a specific target, keeping the final Docker image small.
- **Trade-off**: Increases build-time complexity but improves runtime efficiency and image size.

### 4. Shared Platform Interface

- **Decision**: Define a common interface or base class for platforms in `packages/core` or a new `packages/platform/base`.
- **Rationale**: Ensures consistency across all platforms and allows the unified service to interact with them through a stable API (e.g., `init()`, `start()`, `stop()`).

## Risks / Trade-offs

| Risk | Mitigation |
|------|-------------|
| **Increased Complexity** | Ensure the abstraction is simple. Don't over-engineer the platform interface. |
| **Breaking Changes in Workspace** | Carefully update `pnpm-workspace.yaml` and `turbo.json`. Run all tests after movement. |
| **Runtime Overhead** | Dynamic loading might add slight startup overhead, but for a long-running bot service, this is negligible. |
| **Dependency Bloat** | Use tree-shaking and build-time flags to ensure only necessary dependencies are included in the final bundle. |

## Migration Plan

1.  **Phase 1**: Create `packages/platform/discord` and move logic from `apps/discord-bot`.
2.  **Phase 2**: Create `packages/platform/github` and move logic from `apps/github-bot`.
3.  **Phase 3**: Implement `apps/relay-service` and integrate both platforms.
4.  **Phase 4**: Verify all features (Slash commands in Discord, Webhooks in GitHub) still work correctly.
5.  **Phase 5**: Update Docker/CI configuration to use the new unified service.
