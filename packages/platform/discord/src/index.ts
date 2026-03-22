import type { PlatformPlugin } from '@agent-relay/core'
import { PlatformDiscord } from './platform'

export * from './commands/index'
export * from './config'
export * from './platform'
export * from './rate-limit'
export * from './thread-session-store'

const plugin: PlatformPlugin = {
  id: 'discord',
  displayName: 'Discord',
  create: async () => new PlatformDiscord(),
}

export default plugin
