import type { ProviderPlugin } from '@agent-relay/core'
import { createGeminiProvider } from './provider'

export type { GeminiProviderConfig } from './config'
export { createGeminiProvider, toUserFacingError } from './provider'
export type { GeminiProvider } from './provider'

const plugin: ProviderPlugin = {
  id: 'gemini',
  displayName: 'Gemini',
  create: async () => createGeminiProvider(),
}

export default plugin
