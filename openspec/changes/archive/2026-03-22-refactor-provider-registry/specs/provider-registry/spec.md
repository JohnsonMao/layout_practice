## ADDED Requirements

### Requirement: Provider Registry Interface
The system SHALL provide a `ProviderRegistry` interface that allows dynamic registration of `RelayProvider` implementations.

#### Scenario: Registering a new provider
- **WHEN** a provider package registers itself via the Registry
- **THEN** the registry stores the provider factory
- **THEN** the relay service can retrieve the provider instance by ID

### Requirement: Provider Retrieval
The system SHALL support retrieving registered providers by ID.

#### Scenario: Retrieving an existing provider
- **WHEN** the system requests a provider by a registered ID
- **THEN** the registry returns the corresponding provider factory instance
