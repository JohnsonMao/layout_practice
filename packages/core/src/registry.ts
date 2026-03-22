import type { CreateChatProvider, Platform, StreamingProvider } from './types'

/** A unified provider interface combining streaming and chat creation capabilities. */
export type RelayProvider = StreamingProvider & Partial<CreateChatProvider>

/** Definition for a provider plugin. */
export interface ProviderPlugin {
  id: string
  displayName: string
  create: () => Promise<RelayProvider>
}

/** Definition for a platform plugin. */
export interface PlatformPlugin {
  id: string
  displayName: string
  create: () => Promise<Platform>
}

/** Central registry for managing available plugins (providers and platforms). */
export class PluginRegistry {
  private providers = new Map<string, ProviderPlugin>()
  private platforms = new Map<string, PlatformPlugin>()

  /** Register a provider plugin. */
  registerProvider(plugin: ProviderPlugin) {
    this.providers.set(plugin.id, plugin)
  }

  /** Register a platform plugin. */
  registerPlatform(plugin: PlatformPlugin) {
    this.platforms.set(plugin.id, plugin)
  }

  /** Get a provider plugin by ID. */
  getProvider(id: string): ProviderPlugin | undefined {
    return this.providers.get(id)
  }

  /** Get a platform plugin by ID. */
  getPlatform(id: string): PlatformPlugin | undefined {
    return this.platforms.get(id)
  }

  /** Get all registered provider plugins. */
  getAllProviders(): ProviderPlugin[] {
    return Array.from(this.providers.values())
  }

  /** Get all registered platform plugins. */
  getAllPlatforms(): PlatformPlugin[] {
    return Array.from(this.platforms.values())
  }
}
