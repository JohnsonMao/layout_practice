# Design: Add Gemini Provider

## Context

- **Current state**: Relay has two providers: `cursor-cli` (spawns Cursor CLI) and `copilot-sdk` (GitHub Copilot SDK). Both implement `Provider` and `StreamingProvider` from `@agent-relay/core`; copilot-sdk also exposes `createChat(workspace?)` for session resume.
- **Constraints**: Core defines only types and interfaces and MUST NOT depend on any provider. New code lives in `packages/provider/gemini` and depends only on `@agent-relay/core`. Apps choose provider via relay config.
- **Stakeholders**: Apps (Discord/Slack bots) that want to use Gemini as backend; no change to core or other providers.

## Goals / Non-Goals

**Goals:**

- Implement a Gemini-backed provider that satisfies `Provider` and `StreamingProvider`.
- Use official Google Gemini SDK (e.g. `@google/generative-ai`) for API calls and streaming.
- Config via environment (e.g. `GEMINI_API_KEY`, optional `GEMINI_MODEL`).
- Map Gemini responses and errors to relay types (`StreamChunk`, `RelayError`); optional `createChat` if the SDK supports chat/session.

**Non-Goals:**

- Changing core types or relay behaviour.
- Supporting Gemini-specific features beyond the existing relay contract (text, tool_call, done, error).
- Implementing other Google APIs (e.g. Vertex) in this change.

## Decisions

### 1. Which Gemini client

- **Choice**: Use `@google/generative-ai` (Google’s official Node SDK for Gemini API).
- **Rationale**: Official, supports generateContent and streaming; well documented. Alternatives: raw REST (more code, no streaming helpers) or Vertex SDK (different auth and endpoint; can be a later extension).
- **Alternatives considered**: `google-generativeai` (same package, npm name); direct REST — rejected for maintenance and streaming complexity.

### 2. Auth and config

- **Choice**: API key from env `GEMINI_API_KEY`; optional default model from `GEMINI_MODEL`. Provider factory accepts optional overrides (e.g. `apiKey`, `model`) for tests and flexibility.
- **Rationale**: Matches existing providers (e.g. Copilot token from env); no secrets in code.
- **Alternatives considered**: Only constructor config (no env) — rejected to align with other providers and 12-factor style.

### 3. Session / createChat

- **Choice**: Implement `createChat(workspace?)` if the SDK exposes a multi-turn chat/session abstraction (e.g. `startChat()`). Return an opaque `{ chatId: string }` for relay’s `sessionId`. If the SDK only has single-shot generate, implement execute/executeStream only and omit createChat (or no-op that throws “not supported”).
- **Rationale**: Parity with Copilot/Cursor for apps that store sessionId; depends on SDK capabilities.
- **Alternatives considered**: Always omit createChat — rejected to keep option open for session-based usage.

### 4. Streaming and chunk mapping

- **Choice**: Use SDK’s streaming API (e.g. `generateContentStream`). Map each text delta to `StreamChunk` type `text`; on stream end yield `done`; on error yield `error`. If SDK exposes tool calls, map to `tool_call` chunks with `isCompleted`/`isRejected` where possible; otherwise only text + done + error.
- **Rationale**: Relay already supports text/tool_call/done/error; minimal mapping keeps provider simple and consistent with core types.

### 5. Dependency direction and package layout

- **Choice**: New package `packages/provider/gemini`; dependency direction: `gemini` → `core` only. No dependency from core to gemini or from other packages to gemini (except apps that instantiate the provider).
- **Rationale**: Matches existing provider boundary; core stays provider-agnostic.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Gemini API rate limits or quota | Return clear `RelayError` (e.g. `RATE_LIMIT`); document env and quota in README. |
| SDK API changes or version drift | Pin `@google/generative-ai` in package.json; add integration or smoke test that can be run with a test key. |
| createChat not available in SDK | Design allows omitting createChat; apps can still use executeStream without sessionId. |
| Token/cost visibility | Out of scope for this change; can be added later (logging or metrics). |

## Migration Plan

- **Deploy**: Add `packages/provider/gemini`; apps add dependency and pass `createGeminiProvider()` to relay config; no migration of existing providers.
- **Rollback**: Remove gemini from relay config and revert to previous provider; no data migration.

## Open Questions

- Confirm whether `@google/generative-ai`’s `startChat()` (or equivalent) returns a stable session id for multi-turn; if yes, implement createChat; if no, document “session not supported” and omit or no-op createChat.
