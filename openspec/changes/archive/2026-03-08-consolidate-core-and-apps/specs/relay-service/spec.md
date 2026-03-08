## ADDED Requirements

### Requirement: Orchestration management
The `relay-service` SHALL manage the selection and instantiation of LLM providers and SHALL construct the `RelayContext` for all active platforms.

#### Scenario: Service constructs context
- **WHEN** the service starts with enabled platforms
- **THEN** it SHALL resolve the `RELAY_PROVIDER` setting, instantiate the provider, and provide the resulting context to each platform.
