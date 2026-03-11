## Summary

Optimize and unify core logic and configurations across the project to reduce code duplication and improve maintainability.

## Motivation

As the project grows with more platforms (Discord, GitHub) and providers (Cursor CLI, Copilot SDK, Gemini), certain logic like rate limiting and environment loading is being duplicated. Additionally, build configurations (tsup, vitest) are nearly identical across packages, leading to maintenance overhead. Centralizing these into `@agent-relay/core` or shared base configurations will ensure consistency and simplify the addition of new integrations.

## Proposed Solution

1.  **Centralize Rate Limiting**: Move `createRateLimiter` from platform packages to `@agent-relay/core`.
2.  **Unify Build Configurations**: Create base `tsup` and `vitest` configurations at the root and have packages extend them.
3.  **Generic Utilities**: Move common utility functions (e.g., text truncation) to `@agent-relay/core`.
4.  **Standardize Environment Handling**: Refine how environment variables are loaded and validated in a central way.
5.  **Session Store Interface**: Define a standard `SessionStore` interface in `core` to decouple platforms from specific storage implementations (like SQLite).

## Impact

- **Affected Specs**: `core-relay`, `core-composition` (may need updates to reflect new shared utilities or interfaces).
- **Affected Code**:
  - `packages/core` (new exports and logic)
  - `packages/platform/discord`, `packages/platform/github` (removal of duplicated logic)
  - `apps/relay-service` (updated initialization)
  - Root configuration files (`tsup.base.config.ts`, `vitest.base.config.ts`)
