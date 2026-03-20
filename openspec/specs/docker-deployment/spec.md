# docker-deployment Specification

## Purpose

TBD - created by archiving change 'support-docker-execution'. Update Purpose after archive.

## Requirements

### Requirement: Docker Image Construction
The system SHALL provide a multi-stage `Dockerfile` in the root directory that can build the entire pnpm monorepo and produce a production-ready image for the `relay-service`.

#### Scenario: Build Docker Image
- **WHEN** the user runs `docker build -t agent-relay .`
- **THEN** the system SHALL successfully construct a Docker image containing the built `relay-service` and its dependencies.


<!-- @trace
source: support-docker-execution
updated: 2026-03-21
code:
  - packages/provider/cursor-cli/package.json
  - packages/provider/cursor-cli/tsup.config.ts
  - apps/relay-service/src/index.ts
  - packages/platform/discord/package.json
  - .dockerignore
  - apps/relay-service/tsup.config.ts
  - packages/platform/discord/tsconfig.json
  - packages/platform/github/package.json
  - packages/platform/discord/tsup.config.ts
  - package.json
  - packages/platform/github/tsconfig.json
  - apps/relay-service/package.json
  - packages/provider/copilot-sdk/tsconfig.json
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/tsconfig.json
  - packages/provider/gemini/tsconfig.json
  - packages/core/tsup.config.ts
  - packages/core/package.json
  - packages/provider/gemini/tsup.config.ts
  - packages/platform/github/tsup.config.ts
  - packages/core/tsconfig.json
  - packages/provider/copilot-sdk/package.json
  - docker-compose.yml
  - packages/provider/gemini/package.json
  - turbo.json
  - Dockerfile
  - packages/provider/copilot-sdk/tsup.config.ts
-->

---
### Requirement: Service Execution via Docker Compose
The system SHALL provide a `docker-compose.yml` file that defines the `relay-service` container and its necessary configurations.

#### Scenario: Start Service with Docker Compose
- **WHEN** the user runs `docker-compose up -d`
- **THEN** the system SHALL start the `relay-service` container in the background.


<!-- @trace
source: support-docker-execution
updated: 2026-03-21
code:
  - packages/provider/cursor-cli/package.json
  - packages/provider/cursor-cli/tsup.config.ts
  - apps/relay-service/src/index.ts
  - packages/platform/discord/package.json
  - .dockerignore
  - apps/relay-service/tsup.config.ts
  - packages/platform/discord/tsconfig.json
  - packages/platform/github/package.json
  - packages/platform/discord/tsup.config.ts
  - package.json
  - packages/platform/github/tsconfig.json
  - apps/relay-service/package.json
  - packages/provider/copilot-sdk/tsconfig.json
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/tsconfig.json
  - packages/provider/gemini/tsconfig.json
  - packages/core/tsup.config.ts
  - packages/core/package.json
  - packages/provider/gemini/tsup.config.ts
  - packages/platform/github/tsup.config.ts
  - packages/core/tsconfig.json
  - packages/provider/copilot-sdk/package.json
  - docker-compose.yml
  - packages/provider/gemini/package.json
  - turbo.json
  - Dockerfile
  - packages/provider/copilot-sdk/tsup.config.ts
-->

---
### Requirement: Container Isolation
The `relay-service` SHALL run in an isolated environment within the Docker container, using a non-root user for execution to enhance security.

#### Scenario: Run as Non-Root
- **WHEN** the container is started
- **THEN** the process inside the container SHALL be owned by a non-root user.

<!-- @trace
source: support-docker-execution
updated: 2026-03-21
code:
  - packages/provider/cursor-cli/package.json
  - packages/provider/cursor-cli/tsup.config.ts
  - apps/relay-service/src/index.ts
  - packages/platform/discord/package.json
  - .dockerignore
  - apps/relay-service/tsup.config.ts
  - packages/platform/discord/tsconfig.json
  - packages/platform/github/package.json
  - packages/platform/discord/tsup.config.ts
  - package.json
  - packages/platform/github/tsconfig.json
  - apps/relay-service/package.json
  - packages/provider/copilot-sdk/tsconfig.json
  - apps/relay-service/tsconfig.json
  - packages/provider/cursor-cli/tsconfig.json
  - packages/provider/gemini/tsconfig.json
  - packages/core/tsup.config.ts
  - packages/core/package.json
  - packages/provider/gemini/tsup.config.ts
  - packages/platform/github/tsup.config.ts
  - packages/core/tsconfig.json
  - packages/provider/copilot-sdk/package.json
  - docker-compose.yml
  - packages/provider/gemini/package.json
  - turbo.json
  - Dockerfile
  - packages/provider/copilot-sdk/tsup.config.ts
-->