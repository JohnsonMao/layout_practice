import type { Platform, RelayContext, StreamChunk } from '@agent-relay/core'
import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Message,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js'
import { getConfig, truncateForDiscord } from './config'
import { createRateLimiter } from './rate-limit'
import { deleteSession, getSession, setSession } from './thread-session-store'

const RATE_LIMIT_PER_MIN = 5
const THINKING_LABEL = '💭 Thinking...'

export class PlatformDiscord implements Platform {
  readonly name = 'discord'
  private client: Client | null = null
  private ctx: RelayContext | null = null
  private rateLimiter = createRateLimiter({ windowMs: 60_000, maxPerWindow: RATE_LIMIT_PER_MIN })
  private processingThreadIds = new Set<string>()

  async init(ctx: RelayContext): Promise<void> {
    const { token } = getConfig()
    if (!token) {
      throw new Error('DISCORD_TOKEN is missing')
    }
    this.ctx = ctx

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
      rest: { timeout: 30_000 },
    })

    this.setupEvents()
  }

  async start(): Promise<void> {
    if (!this.client)
      throw new Error('Client not initialized')
    const { token } = getConfig()
    await this.client.login(token)
  }

  async stop(): Promise<void> {
    if (this.client) {
      await this.client.destroy()
      this.client = null
    }
  }

  private setupEvents(): void {
    if (!this.client)
      return

    this.client.once(Events.ClientReady, (c) => {
      process.stdout.write(`[Discord] Logged in as ${c.user.tag}.\n`)
    })

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === 'create-chat') {
          const title = interaction.options.getString('title', true)
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
          await this.handleCreateChat(title, interaction.user.id, textChannel, async (content) => {
            await interaction.editReply(content)
          })
        }
      }
    })

    this.client.on(Events.MessageCreate, async (message) => {
      if (!this.client)
        return
      if (message.author.bot || message.author.id === this.client.user?.id)
        return
      const channel = message.channel
      if (!channel.isThread())
        return
      const thread = channel
      const botUserId = this.client.user?.id
      if (!botUserId || !this.isThreadOwnedByThisBot(thread, botUserId))
        return
      if (this.processingThreadIds.has(thread.id))
        return
      const session = await getSession(thread.id)
      if (!session)
        return
      const content = message.content?.trim()
      if (!content || content.startsWith('/'))
        return
      await this.handleThreadFollowUp(thread, content, message.author.id, session)
    })
  }

  private async runStream(
    stream: AsyncGenerator<StreamChunk, void, undefined>,
    options: {
      thread: ThreadChannel
      statusMsgRef: { current: Message }
      onSession?: (sessionId: string) => void
    },
  ): Promise<{ success: boolean, error?: string }> {
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
          if (chunk.text.trim()) {
            await editThenNewThinking(chunk.text)
          }
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

  private async handleCreateChat(
    title: string,
    userId: string,
    channel: TextChannel,
    deferEditReply: (content: string) => Promise<unknown>,
  ): Promise<void> {
    if (!this.rateLimiter.check(userId)) {
      await deferEditReply('⏱️ Rate limit exceeded. Please try again later (max 5 per minute).')
      return
    }
    this.rateLimiter.record(userId)

    const threadName = title.slice(0, 100).replace(/\n/g, ' ').trim() || 'chat'
    const thread = await channel.threads.create({
      name: threadName,
      type: ChannelType.PublicThread,
      reason: 'Create chat',
    })
    await deferEditReply(`Thread created: <#${thread.id}>`)

    if (!this.ctx)
      return

    try {
      const { chatId } = await this.ctx.activeCreateChatProvider.createChat()
      await setSession(thread.id, chatId, undefined, undefined, this.ctx.activeProviderKind)
      const label = this.ctx.activeProviderDisplayName
        ? `Ready. Send messages here to chat with AI (using ${this.ctx.activeProviderDisplayName}).`
        : 'Ready. Send messages here to chat with AI.'
      await thread.send(`${label}`).catch(() => {})
    }
    catch (err) {
      const msg = this.ctx.formatCreateChatError(err)
      await thread.send(`❌ Failed to create chat: ${truncateForDiscord(msg)}\nTry again later or create a new thread.`).catch(() => {})
    }
  }

  private async handleThreadFollowUp(
    thread: ThreadChannel,
    content: string,
    userId: string,
    session: { sessionId: string, workspace?: string, model?: string, provider?: string },
  ): Promise<void> {
    if (!this.rateLimiter.check(userId)) {
      await thread.send('⏱️ Rate limit exceeded. Please try again later (max 5 per minute).').catch(() => {})
      return
    }
    this.rateLimiter.record(userId)

    this.processingThreadIds.add(thread.id)
    const statusMsgRef = { current: await thread.send(THINKING_LABEL) }

    if (!this.ctx)
      return

    const relay = this.ctx.getRelayForSession(session)
    if (!relay) {
      await thread.send(`❌ ${this.ctx.getRunStreamUnavailableMessage(session)}`).catch(() => {})
      this.processingThreadIds.delete(thread.id)
      return
    }
    const stream = relay.runStream({
      prompt: content,
      workspace: session.workspace,
      sessionId: session.sessionId,
      ...(session.model && { options: { model: session.model } }),
    })

    try {
      const { success, error } = await this.runStream(stream, {
        thread,
        statusMsgRef,
      })

      if (!success) {
        await deleteSession(thread.id)
        await thread.send(`❌ ${truncateForDiscord(error ?? 'Unknown error')}\nUse \`/create-chat\` to start a new thread.`).catch(() => {})
      }
    }
    finally {
      this.processingThreadIds.delete(thread.id)
    }
  }

  private isThreadOwnedByThisBot(thread: ThreadChannel, botUserId: string): boolean {
    return thread.ownerId === botUserId
  }
}
