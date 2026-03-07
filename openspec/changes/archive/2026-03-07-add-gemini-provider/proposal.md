# Proposal: Add Gemini Provider

## Goals

- Add a new relay provider that calls Google Gemini API so agent-relay can use Gemini as a backend.
- Implement the same core interfaces as existing providers (`Provider` / `StreamingProvider` from `@agent-relay/core`) for consistency and pluggability.

## Non-Goals

- Changing core relay types or existing provider contracts.
- Supporting Gemini-only features (e.g. native tools) beyond what the relay already supports (streaming text, tool_call, done, error).
- Replacing or deprecating Cursor CLI or Copilot providers.

## Why

Teams want to use Google Gemini as an alternative backend for the agent-relay (e.g. for cost, region, or model choice). Today only Cursor CLI and Copilot SDK are available; adding a Gemini provider gives a third option without changing existing behaviour.

## What Changes

- New package `packages/provider/gemini` that implements `Provider` and `StreamingProvider`.
- Configuration: API key via env (e.g. `GEMINI_API_KEY`) and optional model/env for defaults.
- Streaming: use Gemini’s streaming API and map responses to `StreamChunk` (text, tool_call where applicable, done, error).
- Optional `createChat(workspace?)` returning a session/chat identifier if Gemini’s API supports multi-turn sessions, for parity with other providers where apps need a sessionId for resume.
- Error handling: map Gemini errors to `RelayError` (e.g. auth, rate limit, timeout) with clear codes and user-facing messages.
- No changes to `packages/core` or to existing providers.

## Capabilities

### New Capabilities

- `provider-gemini`: Implements a relay provider that calls Google Gemini API; supports execute/executeStream, optional createChat; config via env; maps Gemini responses to relay types and errors.

### Modified Capabilities

- _(none)_

## Impact

- **New code**: `packages/provider/gemini/` (package.json, tsconfig, src: provider, config, tests).
- **Dependencies**: New dependency on Google Gemini SDK/API client (e.g. `@google/generative-ai` or official SDK); no new dependencies in core or other packages.
- **Apps**: Discord/Slack bots can switch to or add Gemini by configuring the relay with the new provider; no app code change required beyond config.
- **APIs**: No changes to core `RelayRequest` / `RelayResponse` / `StreamChunk`; Gemini provider consumes and produces these types only.
