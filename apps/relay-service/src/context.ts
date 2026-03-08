/**
 * Composition root: builds relay and create-chat provider from RELAY_PROVIDER.
 * This app-level module is responsible for wiring concrete providers together.
 */
import { createRelay, type Relay, RELAY_PROVIDER_OPTIONS, type RelayContext, type RelayProviderType, type SessionWithProvider } from '@agent-relay/core'
import { createCopilotProvider, toUserFacingError } from '@agent-relay/provider-copilot-sdk'
import { createCursorCliProvider } from '@agent-relay/provider-cursor-cli'
import { createGeminiProvider } from '@agent-relay/provider-gemini'

const DEFAULT_RELAY_PROVIDER: RelayProviderType = 'cursor-cli'

/**
 * Read RELAY_PROVIDER from env; return default when unset or invalid.
 */
function getRelayProviderFromEnv(): RelayProviderType {
  const raw = process.env.RELAY_PROVIDER ?? DEFAULT_RELAY_PROVIDER
  return (RELAY_PROVIDER_OPTIONS as readonly string[]).includes(raw)
    ? (raw as RelayProviderType)
    : DEFAULT_RELAY_PROVIDER
}

const DISPLAY_NAMES: Record<RelayProviderType, string> = {
  'cursor-cli': 'Cursor CLI',
  'copilot-sdk': 'Copilot',
  'gemini': 'Gemini',
}

export function createRelayContext(): RelayContext {
  const relayProvider = getRelayProviderFromEnv()
  const providerCursor = createCursorCliProvider()
  const providerCopilot
    = relayProvider === 'copilot-sdk' ? createCopilotProvider() : null
  const providerGemini
    = relayProvider === 'gemini' ? createGeminiProvider() : null

  const relayCursor = createRelay({ provider: providerCursor })
  const relayCopilot = providerCopilot ? createRelay({ provider: providerCopilot }) : null
  const relayGemini = providerGemini ? createRelay({ provider: providerGemini }) : null

  let activeCreateChatProvider: any
  if (relayProvider === 'copilot-sdk') {
    activeCreateChatProvider = providerCopilot!
  }
  else if (relayProvider === 'gemini') {
    activeCreateChatProvider = providerGemini!
  }
  else {
    activeCreateChatProvider = providerCursor
  }

  const formatCreateChatError = (err: unknown): string => {
    if (relayProvider === 'copilot-sdk')
      return toUserFacingError(err)
    return err instanceof Error ? err.message : String(err)
  }

  const getRelayForSession = (session: SessionWithProvider): Relay | null => {
    const kind = session.provider ?? relayProvider
    if (kind === 'copilot-sdk')
      return relayCopilot
    if (kind === 'gemini')
      return relayGemini
    return relayCursor
  }

  const getRunStreamUnavailableMessage = (_session: SessionWithProvider): string => {
    return 'Relay backend is not available. Check RELAY_PROVIDER and related environment variables.'
  }

  return {
    activeProviderDisplayName: DISPLAY_NAMES[relayProvider],
    activeProviderKind: relayProvider,
    activeCreateChatProvider,
    formatCreateChatError,
    getRelayForSession,
    getRunStreamUnavailableMessage,
  }
}
