import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Message,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js'
import type { StreamChunk } from '@agent-relay/core'
import { getConfig, truncateForDiscord } from './config'
import { createRateLimiter } from './rate-limit'
import { createRelayContext } from '@agent-relay/relay-context'
import { getSession, setSession, deleteSession } from './thread-session-store'
import { getWorkspacePath } from './workspace-config'

const RATE_LIMIT_PER_MIN = 5
const THINKING_LABEL = '💭 Thinking...'

/** Thread IDs currently processing (no follow-up until done). */
const processingThreadIds = new Set<string>()

async function main(): Promise<void> {
  const { token } = getConfig()
  const rateLimiter = createRateLimiter({ windowMs: 60_000, maxPerWindow: RATE_LIMIT_PER_MIN })
  const ctx = createRelayContext()

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    rest: { timeout: 30_000 },
  })

  client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}.`)
  })

  /**
   * Stream flow: per chunk type edit current status message, optionally send new THINKING_LABEL; on done/error remove status message.
   */
  async function runStreamWithThrottle(
    stream: AsyncGenerator<StreamChunk, void, undefined>,
    options: {
      thread: ThreadChannel
      statusMsgRef: { current: Message }
      onSession?: (sessionId: string) => void
    },
  ): Promise<{ success: boolean; error?: string }> {
    const { thread, statusMsgRef, onSession } = options
    let errorMsg: string | undefined

    const editThenNewThinking = async (content: string) => {
      await statusMsgRef.current.edit(truncateForDiscord(content)).catch(() => {})
      statusMsgRef.current = await thread.send(THINKING_LABEL)
    }

    for await (const chunk of stream) {
      switch (chunk.type) {
        case 'system': {
          onSession?.(chunk.sessionId)
          const modelLabel = chunk.model ? `model: ${chunk.model}` : 'Connecting…'
          await statusMsgRef.current.edit(truncateForDiscord(modelLabel)).catch(() => {})
          statusMsgRef.current = await thread.send(THINKING_LABEL)
          break
        }
        case 'text':
          await editThenNewThinking(chunk.text)
          break
        case 'tool_call': {
          const name = chunk.toolName ?? 'tool'
          if (!chunk.isCompleted) {
            await statusMsgRef.current.edit(truncateForDiscord(`tool calling: ${name}`)).catch(() => {})
          }
          else if (chunk.isRejected) {
            await statusMsgRef.current.edit(truncateForDiscord(`tool rejected: ${name}`)).catch(() => {})
            statusMsgRef.current = await thread.send(THINKING_LABEL)
          }
          else {
            await statusMsgRef.current.edit(truncateForDiscord(`tool done: ${name}`)).catch(() => {})
            statusMsgRef.current = await thread.send(THINKING_LABEL)
          }
          break
        }
        case 'done':
          await statusMsgRef.current.delete().catch(() => {})
          return { success: true, error: errorMsg }
        case 'error':
          errorMsg = `${chunk.error.code}: ${chunk.error.message}`
          await statusMsgRef.current.delete().catch(() => {})
          return { success: false, error: errorMsg }
      }
    }
    return { success: !errorMsg, error: errorMsg }
  }

  /** Handle /create-chat: create thread, create session, show workspace; no initial prompt. */
  async function handleCreateChat(
    title: string,
    userId: string,
    channel: TextChannel,
    deferEditReply: (content: string) => Promise<unknown>,
    workspaceId?: string | null,
  ): Promise<void> {
    if (!rateLimiter.check(userId)) {
      await deferEditReply('⏱️ Rate limit exceeded. Please try again later (max 5 per minute).')
      return
    }
    rateLimiter.record(userId)

    const workspace = (workspaceId && getWorkspacePath(workspaceId)) ?? process.cwd()
    const threadName = title.slice(0, 100).replace(/\n/g, ' ').trim() || 'chat'
    const thread = await channel.threads.create({
      name: threadName,
      type: ChannelType.PublicThread,
      reason: 'Create chat',
    })
    await deferEditReply(`Thread created: <#${thread.id}>`)

    try {
      const { chatId } = await ctx.activeCreateChatProvider.createChat(workspace)
      await setSession(thread.id, chatId, workspace, undefined, ctx.activeProviderKind)
      const label = ctx.activeProviderDisplayName
        ? `Ready. Send messages here to chat with AI (using ${ctx.activeProviderDisplayName}).`
        : 'Ready. Send messages here to chat with AI.'
      await thread.send(`${label}\n**Workspace:** ${workspace}`).catch(() => {})
    }
    catch (err) {
      const msg = ctx.formatCreateChatError(err)
      await thread.send(`❌ Failed to create chat: ${truncateForDiscord(msg)}\nTry again later or create a new thread.`).catch(() => {})
    }
  }

  /** Handle follow-up message in a thread that has a stored session (resume). */
  async function handleThreadFollowUp(
    thread: ThreadChannel,
    content: string,
    userId: string,
    session: { sessionId: string; workspace: string; model?: string; provider?: 'cursor-cli' | 'copilot-sdk' },
  ): Promise<void> {
    if (!rateLimiter.check(userId)) {
      await thread.send('⏱️ Rate limit exceeded. Please try again later (max 5 per minute).').catch(() => {})
      return
    }
    rateLimiter.record(userId)

    processingThreadIds.add(thread.id)
    const statusMsgRef = { current: await thread.send(THINKING_LABEL) }

    const relay = ctx.getRelayForSession(session)
    if (!relay) {
      await thread.send(`❌ ${ctx.getRunStreamUnavailableMessage(session)}`).catch(() => {})
      processingThreadIds.delete(thread.id)
      return
    }
    const stream = relay.runStream({
      prompt: content,
      workspace: session.workspace,
      sessionId: session.sessionId,
      ...(session.model && { options: { model: session.model } }),
    })

    try {
      const { success, error } = await runStreamWithThrottle(stream, {
        thread,
        statusMsgRef,
      })

      if (!success) {
        await deleteSession(thread.id)
        await thread.send(`❌ ${truncateForDiscord(error ?? 'Unknown error')}\nUse \`/create-chat\` to start a new thread.`).catch(() => {})
      }
    }
    finally {
      processingThreadIds.delete(thread.id)
    }
  }

  /** True if the thread was created/owned by this bot (same application). */
  function isThreadOwnedByThisBot(thread: ThreadChannel, botUserId: string): boolean {
    return thread.ownerId === botUserId
  }

  client.on(Events.InteractionCreate, async interaction => {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'create-chat') {
        const title = interaction.options.getString('title', true)
        const workspaceId = interaction.options.getString('workspace') ?? null
        const channel = interaction.channel
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
          await interaction.reply({ content: 'This command can only be used in a server text channel.', ephemeral: true })
          return
        }
        const textChannel = channel as TextChannel
        if (!textChannel.threads) {
          await interaction.reply({ content: 'This channel does not support creating threads.', ephemeral: true })
          return
        }
        await interaction.deferReply()
        await handleCreateChat(title, interaction.user.id, textChannel, async content => {
          await interaction.editReply(content)
        }, workspaceId)
        return
      }
    }

  })

  client.on(Events.MessageCreate, async message => {
    if (message.author.bot || message.author.id === client.user?.id)
      return
    const channel = message.channel
    if (!channel.isThread())
      return
    const thread = channel
    const botUserId = client.user?.id
    if (!botUserId || !isThreadOwnedByThisBot(thread, botUserId))
      return
    if (processingThreadIds.has(thread.id))
      return
    const session = await getSession(thread.id)
    if (!session)
      return
    const content = message.content?.trim()
    if (!content || content.startsWith('/'))
      return
    await handleThreadFollowUp(thread, content, message.author.id, session)
  })

  client.login(token).catch((err: unknown) => {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('Failed to connect to Discord. If you see Connect Timeout, check network, firewall, or VPN blocking Discord.')
    console.error(msg)
    process.exit(1)
  })
}

main().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})
