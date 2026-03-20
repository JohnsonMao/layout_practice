## ADDED Requirements

### Requirement: Docker Image Construction
The system SHALL provide a multi-stage `Dockerfile` in the root directory that can build the entire pnpm monorepo and produce a production-ready image for the `relay-service`.

#### Scenario: Build Docker Image
- **WHEN** the user runs `docker build -t agent-relay .`
- **THEN** the system SHALL successfully construct a Docker image containing the built `relay-service` and its dependencies.

### Requirement: Service Execution via Docker Compose
The system SHALL provide a `docker-compose.yml` file that defines the `relay-service` container and its necessary configurations.

#### Scenario: Start Service with Docker Compose
- **WHEN** the user runs `docker-compose up -d`
- **THEN** the system SHALL start the `relay-service` container in the background.

### Requirement: Container Isolation
The `relay-service` SHALL run in an isolated environment within the Docker container, using a non-root user for execution to enhance security.

#### Scenario: Run as Non-Root
- **WHEN** the container is started
- **THEN** the process inside the container SHALL be owned by a non-root user.
