# Agent Relay

Unified AI relay service for multiple platforms. This service acts as an orchestration layer between various communication platforms (Discord, GitHub, Slack) and AI providers (Cursor CLI, Gemini, Copilot SDK).

## Architecture

The project is organized as a pnpm monorepo:

- `packages/core`: Centralized types, interfaces (including `Platform` and `RelayContext`), and the relay engine.
- `packages/platform/*`: Implementation-specific logic for communication platforms.
  - `packages/platform/discord`: Discord bot integration.
  - `packages/platform/github`: GitHub Webhook integration.
- `packages/provider/*`: Implementation-specific logic for LLM providers.
- `apps/relay-service`: The **Composition Root** and single application entry point. It handles configuration, dependency injection, and manages the lifecycle of all enabled platforms.

## Getting Started

### Prerequisites

- Node.js 20.x
- pnpm 10.x

### Configuration

The service is driven by environment variables. Create a `.env` file in the root:

```env
# Orchestration
RELAY_PLATFORMS=discord,github  # Comma-separated list of platforms to enable
RELAY_PROVIDER=cursor-cli       # Default LLM provider

# Platform: Discord
DISCORD_TOKEN=your_token
DISCORD_CLIENT_ID=your_id

# Platform: GitHub
GITHUB_TOKEN=your_token
WEBHOOK_SECRET=your_secret

# Provider: Gemini (if used)
GEMINI_API_KEY=your_key
```

### Running the Service

```bash
pnpm install
pnpm build
cd apps/relay-service
pnpm start
```

For development:

```bash
cd apps/relay-service
pnpm dev
```

## Dependency Injection & Orchestration

This project follows a clean architecture pattern where:
1. Platforms are decoupled from providers.
2. `apps/relay-service` initializes a `RelayContext` (the orchestration state).
3. `RelayContext` is injected into platforms via the `init()` method.
4. Platforms use the context to interact with the configured LLM provider without knowing its concrete implementation.
