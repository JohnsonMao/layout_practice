import type { ProviderPlugin } from '@agent-relay/core'
import { createCursorCliProvider } from './provider'

export { createCursorCliProvider } from './provider'
export type { CursorCliProvider, CursorCliProviderConfig } from './provider'

const plugin: ProviderPlugin = {
  id: 'cursor-cli',
  displayName: 'Cursor CLI',
  create: async () => createCursorCliProvider(),
}

export default plugin
