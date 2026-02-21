/**
 * Relay backend options and env parsing. Responsibility: which providers exist and which is selected.
 * Does not depend on any concrete provider implementation to avoid circular deps.
 */

export const RELAY_PROVIDER_OPTIONS = ['cursor-cli', 'copilot-sdk'] as const
export type RelayProviderType = (typeof RELAY_PROVIDER_OPTIONS)[number]

const DEFAULT_RELAY_PROVIDER: RelayProviderType = 'cursor-cli'

/**
 * Read RELAY_PROVIDER from env; return default when unset or invalid.
 */
export function getRelayProviderFromEnv(): RelayProviderType {
  const raw = process.env.RELAY_PROVIDER ?? DEFAULT_RELAY_PROVIDER
  return RELAY_PROVIDER_OPTIONS.includes(raw as RelayProviderType)
    ? (raw as RelayProviderType)
    : DEFAULT_RELAY_PROVIDER
}
