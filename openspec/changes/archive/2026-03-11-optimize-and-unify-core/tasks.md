## 1. Core Infrastructure

- [x] 1.1 Move `createRateLimiter` to `packages/core/src/rate-limit.ts` (Reference: 1. Centralize Rate Limiting in `@agent-relay/core`)
- [x] 1.2 Implement generic `truncate` utility in `packages/core/src/utils.ts` (Reference: 3. Extract Common Utilities to `core/utils`)
- [x] 1.3 Define `SessionStore` interface in `packages/core/src/types.ts` (Reference: 4. Standardized `SessionStore` Interface)
- [x] 1.4 Export new utilities and interfaces from `packages/core/src/index.ts`
- [x] 1.5 Update `packages/core` tests to cover new logic

## 2. Shared Build Configuration

- [x] 2.1 Create `tsup.base.config.ts` in project root (Reference: 2. Unified Build Configurations at Root)
- [x] 2.2 Create `vitest.base.config.ts` in project root (Reference: 2. Unified Build Configurations at Root)
- [x] 2.3 Update `packages/core/tsup.config.ts` to extend base config
- [x] 2.4 Update `packages/core/vitest.config.ts` to extend base config

## 3. Platform Refactoring

- [x] 3.1 Refactor `packages/platform/discord` to use `core` rate limiter and truncate utility
- [x] 3.2 Update `packages/platform/discord/tsup.config.ts` to extend base config
- [x] 3.3 Refactor `packages/platform/github` to use `core` rate limiter
- [x] 3.4 Update `packages/platform/github/tsup.config.ts` to extend base config

## 4. Provider and App Configuration Update

- [x] 4.1 Update all `packages/provider/*/tsup.config.ts` to extend base config
- [x] 4.2 Update `apps/relay-service/tsup.config.ts` to extend base config
- [x] 4.3 Verify full project build with `pnpm build`
