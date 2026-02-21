/**
 * Composition root: builds relay and create-chat provider from RELAY_PROVIDER.
 * Only this layer imports concrete provider packages; apps depend only on this package.
 * Apps should not branch on provider kind; ctx provides display name and session→relay/error helpers.
 */
import type { Relay } from '@agent-relay/core'
import { createRelay } from '@agent-relay/core'
import { createCopilotProvider, toUserFacingError } from '@agent-relay/provider-copilot-sdk'
import { createCursorCliProvider } from '@agent-relay/provider-cursor-cli'
import { getRelayProviderFromEnv } from './config'
import type { RelayProviderType } from './config'

export type CreateChatProvider = {
  createChat(workspace?: string): Promise<{ chatId: string }>
}

/** Session may include provider for getRelayForSession / getRunStreamUnavailableMessage. */
export type SessionWithProvider = { provider?: RelayProviderType }

const DISPLAY_NAMES: Record<RelayProviderType, string> = {
  'cursor-cli': 'Cursor CLI',
  'copilot-sdk': 'Copilot',
}

export type RelayContext = {
  /** Display name of the active provider for UI (e.g. "Using Copilot"); app need not branch on kind. */
  activeProviderDisplayName: string
  /** Active provider kind, used only when writing session (e.g. setSession(..., kind)). */
  activeProviderKind: RelayProviderType
  activeCreateChatProvider: CreateChatProvider
  /** Format errors from the active provider into user-facing messages. */
  formatCreateChatError: (err: unknown) => string
  /** Return the Relay for the session's provider; null if that provider is not enabled. */
  getRelayForSession: (session: SessionWithProvider) => Relay | null
  /** User-facing message when getRelayForSession(session) is null. */
  getRunStreamUnavailableMessage: (session: SessionWithProvider) => string
}

export function createRelayContext(): RelayContext {
  const relayProvider = getRelayProviderFromEnv()
  const providerCursor = createCursorCliProvider()
  const providerCopilot =
    relayProvider === 'copilot-sdk' ? createCopilotProvider() : null
  const relayCursor = createRelay({ provider: providerCursor })
  const relayCopilot = providerCopilot ? createRelay({ provider: providerCopilot }) : null
  const activeCreateChatProvider: CreateChatProvider =
    relayProvider === 'copilot-sdk' ? providerCopilot! : providerCursor

  const formatCreateChatError = (err: unknown): string => {
    if (relayProvider === 'copilot-sdk')
      return toUserFacingError(err)
    return err instanceof Error ? err.message : String(err)
  }

  const getRelayForSession = (session: SessionWithProvider): Relay | null => {
    const kind = session.provider ?? relayProvider
    if (kind === 'copilot-sdk')
      return relayCopilot
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
