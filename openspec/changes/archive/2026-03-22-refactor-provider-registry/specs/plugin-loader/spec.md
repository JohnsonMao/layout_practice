## ADDED Requirements

### Requirement: Plugin Loader Configuration
The system SHALL support a `registry.config.ts` file to statically define enabled plugins.

#### Scenario: Loading plugins from config
- **WHEN** the application starts
- **THEN** the loader reads `registry.config.ts`
- **THEN** it registers all providers and platforms defined therein

### Requirement: Automatic Plugin Discovery
The system SHALL support automatic discovery of plugin packages in the workspace when the config is missing.

#### Scenario: Discovering plugins automatically
- **WHEN** `registry.config.ts` is absent
- **THEN** the system scans the `packages/` directory for plugins
- **THEN** it dynamically loads all discovered plugins
