## 1. Package setup

- [x] 1.1 Add `packages/provider/gemini` directory and package.json (name `@agent-relay/provider-gemini`, dependency on `@agent-relay/core` and `@google/generative-ai`, scripts build/test)
- [x] 1.2 Add tsconfig and ensure package is included in pnpm-workspace and turbo build/test pipeline

## 2. Config and factory

- [x] 2.1 Implement config: read `GEMINI_API_KEY` and optional `GEMINI_MODEL` from env; support factory overrides (apiKey, model, timeoutMs)
- [x] 2.2 Implement createGeminiProvider(config?) that returns a provider instance; fail or warn when API key is missing at first use

## 3. Execute and error mapping

- [x] 3.1 Implement execute(request): call Gemini generateContent, map response to RelayResponse (success with result string or error with RelayError)
- [x] 3.2 Map API errors to RelayError codes (GEMINI_AUTH_ERROR, GEMINI_RATE_LIMIT, GEMINI_API_ERROR, TIMEOUT) with user-facing messages; add toUserFacingError helper if needed

## 4. Streaming

- [x] 4.1 Implement executeStream(request): use SDK generateContentStream, yield StreamChunk type "text" for each delta, "done" on success
- [x] 4.2 On stream error or timeout, yield StreamChunk type "error" and stop; enforce configurable timeout

## 5. Optional createChat

- [x] 5.1 If SDK supports startChat/session: implement createChat(workspace?) returning Promise<{ chatId: string }> and support request.sessionId in executeStream for multi-turn
- [x] 5.2 If SDK does not support sessions: omit createChat or document and throw clear "not supported" when createChat is called

## 6. Tests

- [x] 6.1 Unit tests: config from env and overrides; error mapping (auth, rate limit, timeout)
- [x] 6.2 Unit or integration tests: execute and executeStream with mocked SDK or test key; verify StreamChunk shapes and done/error behaviour
