import fs from 'node:fs/promises'
import path from 'node:path'
import { findRepoRoot, type PluginRegistry } from '@agent-relay/core'

export interface RegistryConfig {
  providers?: string[]
  platforms?: string[]
}

export class PluginLoader {
  constructor(private registry: PluginRegistry) {}

  async load(configPath?: string) {
    const config = await this.loadConfig(configPath)

    if (config) {
      process.stdout.write('[PluginLoader] Loading from config...\n')
      await this.loadFromConfig(config)
    }
    else {
      process.stdout.write('[PluginLoader] Config not found, starting auto-discovery...\n')
      await this.autoDiscover()
    }
  }

  private async loadConfig(configPath?: string): Promise<RegistryConfig | null> {
    const tryPaths = configPath
      ? [configPath]
      : [
          path.resolve(process.cwd(), 'registry.config.ts'),
          path.resolve(process.cwd(), 'registry.config.js'),
        ]

    for (const p of tryPaths) {
      try {
        await fs.access(p)
        const mod = await import(p)
        return mod.default || mod.registryConfig
      }
      catch {
        // ignore
      }
    }
    return null
  }

  private async loadFromConfig(config: RegistryConfig) {
    for (const name of config.providers || []) {
      await this.loadModule(name, 'provider')
    }
    for (const name of config.platforms || []) {
      await this.loadModule(name, 'platform')
    }
  }

  private async autoDiscover() {
    const repoRoot = findRepoRoot(process.cwd())
    if (!repoRoot) {
      console.warn('[PluginLoader] Cannot find repo root for auto-discovery')
      return
    }

    const packagesDir = path.join(repoRoot, 'packages')

    await this.scanDir(path.join(packagesDir, 'provider'), 'provider')
    await this.scanDir(path.join(packagesDir, 'platform'), 'platform')
  }

  private async scanDir(dir: string, type: 'provider' | 'platform') {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const pkgName = `@agent-relay/${type}-${entry.name}`
          await this.loadModule(pkgName, type)
        }
      }
    }
    catch {
      // ignore
    }
  }

  private async loadModule(name: string, type: 'provider' | 'platform') {
    try {
      const mod = await import(name)
      const plugin = mod.default

      if (!plugin) {
        console.warn(`[PluginLoader] Module ${name} has no default export`)
        return
      }

      if (type === 'provider') {
        this.registry.registerProvider(plugin)
      }
      else {
        this.registry.registerPlatform(plugin)
      }

      process.stdout.write(`[PluginLoader] Loaded ${type}: ${name}\n`)
    }
    catch {
      console.warn(`[PluginLoader] Failed to load ${type} module: ${name}`)
    }
  }
}
