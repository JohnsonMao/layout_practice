import {
  type CreateChatProvider,
  createRelay,
  PluginRegistry,
  type Relay,
  type RelayContext,
  type RelayProviderType,
  type SessionWithProvider,
  type StreamingProvider,
} from '@agent-relay/core'
import { PluginLoader } from './plugin-loader'

const DEFAULT_RELAY_PROVIDER: RelayProviderType = 'cursor-cli'

/**
 * Initialize Registry and load all providers.
 */
async function initializeRegistry(): Promise<PluginRegistry> {
  const registry = new PluginRegistry()
  const loader = new PluginLoader(registry)
  await loader.load() // Auto-discover or load from registry.config.ts
  return registry
}

export async function createRelayContext(): Promise<RelayContext> {
  const registry = await initializeRegistry()

  // Get active provider from env
  const relayProviderId = (process.env.RELAY_PROVIDER as RelayProviderType) ?? DEFAULT_RELAY_PROVIDER

  const activePlugin = registry.getProvider(relayProviderId)
  if (!activePlugin) {
    throw new Error(`Active provider not found: ${relayProviderId}`)
  }

  const activeCreateChatProvider = await activePlugin.create() as CreateChatProvider

  const getRelayForSession = (session: SessionWithProvider): Relay | null => {
    const kind = session.provider ?? relayProviderId
    const plugin = registry.getProvider(kind)
    if (!plugin)
      return null
    // Note: This creates a new relay instance per request, which is compatible with current architecture
    // but could be optimized to cache instances if needed.
    return createRelay({ provider: plugin.create() as unknown as StreamingProvider })
  }

  return {
    activeProviderDisplayName: activePlugin.displayName,
    activeProviderKind: relayProviderId,
    activeCreateChatProvider,
    formatCreateChatError: (err: unknown): string => {
      // Keep existing error handling logic
      return err instanceof Error ? err.message : String(err)
    },
    getRelayForSession,
    getRunStreamUnavailableMessage: () => 'Relay backend is not available.',
  }
}
