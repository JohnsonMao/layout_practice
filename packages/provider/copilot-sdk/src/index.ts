import type { ProviderPlugin } from '@agent-relay/core'
import { createCopilotProvider } from './provider'

export { createCopilotProvider, toUserFacingError } from './provider'
export type { CopilotProvider, CopilotProviderConfig } from './provider'

const plugin: ProviderPlugin = {
  id: 'copilot-sdk',
  displayName: 'Copilot',
  create: async () => createCopilotProvider(),
}

export default plugin
