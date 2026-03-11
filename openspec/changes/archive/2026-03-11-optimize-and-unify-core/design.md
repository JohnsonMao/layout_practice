## Context

The project consists of multiple packages and apps. Currently, `packages/platform/discord` and `packages/platform/github` duplicate several logic pieces, such as rate limiting and environment variable loading. Furthermore, `tsup` and `vitest` configurations are repeated in every package with minimal differences.

## Goals / Non-Goals

**Goals:**

- Move common logic (Rate Limiter, Truncate utility) to `@agent-relay/core`.
- Create shared base configurations for `tsup` and `vitest` at the repository root.
- Define a standard `SessionStore` interface in `core`.
- Simplify package-level configurations by extending base configs.

**Non-Goals:**

- Rewriting the entire core orchestration logic.
- Changing the existing behavior of Discord or GitHub platforms.
- Implementing a persistent database backend for session storage (out of scope for this refactor).

## Decisions

### 1. Centralize Rate Limiting in `@agent-relay/core`

The `createRateLimiter` function will be moved to `packages/core/src/rate-limit.ts` and exported from the main entry point. Both platforms will then import it from `@agent-relay/core`.

### 2. Unified Build Configurations at Root

Create `tsup.base.config.ts` and `vitest.base.config.ts` in the project root.

- `tsup.base.config.ts`: Define common settings like `format: ['esm']`, `dts: true`, `clean: true`, etc.
- `vitest.base.config.ts`: Define common test settings.
  Each package will then import and spread/extend these configurations.

### 3. Extract Common Utilities to `core/utils`

Move `truncateForDiscord` to `packages/core/src/utils.ts` as a more generic `truncate(text, length)` function.

### 4. Standardized `SessionStore` Interface

Define a `SessionStore` interface in `packages/core/src/types.ts` that includes `get`, `set`, and `delete` methods. This will allow platforms to use different storage backends (SQLite, In-memory, Redis) interchangeably.

## Risks / Trade-offs

- **Risk**: Circular dependency if `core` starts depending on specific platform needs.
  - **Mitigation**: Ensure `core` only contains generic interfaces and logic that do not import from platforms or providers.
- **Risk**: Breaking builds during the transition to base configs.
  - **Mitigation**: Update and test one package at a time using `turbo build`.
- **Risk**: `tsup` `external` field variation.
  - **Mitigation**: Base config will provide defaults, and packages will merge their specific externals.
