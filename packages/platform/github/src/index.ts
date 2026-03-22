import type { PlatformPlugin } from '@agent-relay/core'
import { PlatformGitHub } from './platform'

export * from './config'
export * from './github'
export * from './payload'
export * from './platform'
export * from './rate-limit'
export * from './relay'
export * from './server'
export * from './trigger'
export * from './verify'

const plugin: PlatformPlugin = {
  id: 'github',
  displayName: 'GitHub',
  create: async () => new PlatformGitHub(),
}

export default plugin
