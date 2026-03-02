# Spec: provider-gemini

## ADDED Requirements

### Requirement: Execute via Gemini API

The provider SHALL execute user prompts by calling the Google Gemini API (e.g. via `@google/genai`). The provider SHALL implement `execute(request: RelayRequest): Promise<RelayResponse>`. The provider SHALL require a valid API key (e.g. from `GEMINI_API_KEY`). The provider MAY use `request.workspace` for context or logging; it SHALL NOT be required to pass workspace to the API unless the SDK supports it.

#### Scenario: Successful single-shot execution

- **WHEN** the provider receives a valid request and the API key is set and the Gemini API returns a successful response
- **THEN** the provider SHALL return success with the generated text as the result string

#### Scenario: API key missing

- **WHEN** execute or executeStream is called and the API key is not configured (e.g. `GEMINI_API_KEY` unset)
- **THEN** the provider SHALL return an error response with a code such as `GEMINI_AUTH_ERROR` and a message indicating the user should set the API key

#### Scenario: API returns error

- **WHEN** the Gemini API returns an error (e.g. 4xx/5xx, quota, invalid request)
- **THEN** the provider SHALL return an error response with an appropriate code and a user-facing message derived from the API error

### Requirement: Streaming execution

The provider SHALL implement `StreamingProvider` by providing `executeStream(request)` that uses the SDK’s streaming API and yields `StreamChunk` values (text, done, error). The provider MAY yield `tool_call` chunks if the SDK exposes tool-call events and they can be mapped to the relay’s tool_call shape.

#### Scenario: Stream text and done

- **WHEN** executeStream(request) is called and the SDK yields content chunks
- **THEN** the provider SHALL yield one or more `StreamChunk` of type `text` with the delta content, and SHALL yield a chunk of type `done` when the stream completes successfully

#### Scenario: Stream error

- **WHEN** the stream fails (e.g. API error, network error)
- **THEN** the provider SHALL yield a `StreamChunk` of type `error` with an appropriate code and user-facing message

#### Scenario: Timeout

- **WHEN** the stream does not complete within the configured timeout
- **THEN** the provider SHALL yield a `StreamChunk` of type `error` with a timeout error code and SHALL stop consuming the stream

### Requirement: Configuration

The provider SHALL read configuration from the environment: API key from `GEMINI_API_KEY`. The provider SHALL support an optional default model from `GEMINI_MODEL`. The provider factory MAY accept optional overrides (e.g. `apiKey`, `model`, `timeoutMs`) for tests and flexibility. The provider SHALL NOT hardcode secrets.

#### Scenario: Config from env

- **WHEN** the provider is created with no overrides and `GEMINI_API_KEY` is set
- **THEN** the provider SHALL use that key for API calls and SHALL use `GEMINI_MODEL` as the default model when set

#### Scenario: Override in factory

- **WHEN** the provider factory is called with explicit `apiKey` or `model`
- **THEN** the provider SHALL use the overrides instead of env for those values

### Requirement: Error mapping

The provider SHALL map Gemini API and SDK errors to `RelayError` with stable codes (e.g. `GEMINI_AUTH_ERROR`, `GEMINI_RATE_LIMIT`, `GEMINI_API_ERROR`, `TIMEOUT`). The provider SHALL return short, user-facing messages and SHALL NOT expose raw stack traces or internal details in the relay response.

#### Scenario: Auth failure

- **WHEN** the API returns 401 or invalid API key
- **THEN** the provider SHALL return an error with a code such as `GEMINI_AUTH_ERROR` and a message directing the user to check `GEMINI_API_KEY`

#### Scenario: Rate limit

- **WHEN** the API returns 429 or rate-limit response
- **THEN** the provider SHALL return an error with a code such as `GEMINI_RATE_LIMIT` and a user-facing message

### Requirement: Optional createChat (session)

When the Gemini SDK supports a multi-turn chat or session abstraction (e.g. `startChat()` with a stable session id), the provider SHALL expose `createChat(workspace?: string)` that returns `Promise<{ chatId: string }>`. The returned `chatId` SHALL be usable as `request.sessionId` for subsequent executeStream calls so the relay can resume the same conversation. When the SDK does not support sessions, the provider MAY omit createChat or throw a clear "not supported" error when createChat is called.

#### Scenario: createChat when supported

- **WHEN** the SDK supports chat/session and createChat() is called
- **THEN** the provider SHALL return a non-empty `chatId` that can be passed as sessionId in a later request

#### Scenario: createChat when not supported

- **WHEN** the SDK does not support sessions and createChat() is called
- **THEN** the provider SHALL throw an error or return an error response with a message that session creation is not supported

#### Scenario: ExecuteStream with sessionId

- **WHEN** executeStream is called with request.sessionId set to a chatId previously returned by createChat
- **THEN** the provider SHALL send the prompt in the context of that session (multi-turn) when the SDK supports it; otherwise SHALL behave as a single-turn request
