import {
  ChannelType,
  Client,
  Events,
  GatewayIntentBits,
  type Message,
  type TextChannel,
  type ThreadChannel,
} from 'discord.js'
import { createRelay } from '@agent-relay/core'
import { createCursorCliProvider } from '@agent-relay/provider-cursor-cli'
import { getConfig, truncateForDiscord } from './config'
import { createRateLimiter } from './rate-limit'
import { getSession, setSession, deleteSession } from './thread-session-store'
import { getWorkspacePath } from './workspace-config'

const RATE_LIMIT_PER_MIN = 5
const THINKING_LABEL = '💭 思考中...'

/** Thread IDs currently processing (no follow-up until done). */
const processingThreadIds = new Set<string>()

function main(): void {
  const { token } = getConfig()
  const rateLimiter = createRateLimiter({ windowMs: 60_000, maxPerWindow: RATE_LIMIT_PER_MIN })

  const provider = createCursorCliProvider()
  const relay = createRelay({ provider })

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
    prompt: string,
    options: {
      thread: ThreadChannel
      statusMsgRef: { current: Message }
      workspace: string
      sessionId?: string
      onSession?: (sessionId: string) => void
    },
  ): Promise<{ success: boolean; error?: string }> {
    const { thread, statusMsgRef, workspace, sessionId, onSession } = options
    let errorMsg: string | undefined

    const editThenNewThinking = async (content: string) => {
      await statusMsgRef.current.edit(truncateForDiscord(content)).catch(() => {})
      statusMsgRef.current = await thread.send(THINKING_LABEL)
    }

    const request = {
      prompt,
      workspace,
      ...(sessionId !== undefined && sessionId !== '' && { sessionId }),
    }
    for await (const chunk of relay.runStream(request)) {
      switch (chunk.type) {
        case 'system': {
          onSession?.(chunk.sessionId)
          const modelLabel = chunk.model ? `使用 model: ${chunk.model}` : '連線中…'
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

  /** Handle /prompt: create thread, stream in thread, register for follow-up. */
  async function handlePrompt(
    prompt: string,
    userId: string,
    channel: TextChannel,
    deferEditReply: (content: string) => Promise<unknown>,
    workspaceId?: string | null,
  ): Promise<void> {
    if (!rateLimiter.check(userId)) {
      await deferEditReply('⏱️ 請求過於頻繁，請稍後再試（每分鐘最多 5 次）。')
      return
    }
    rateLimiter.record(userId)

    const workspace = (workspaceId && getWorkspacePath(workspaceId)) ?? process.cwd()
    const name = prompt.slice(0, 100).replace(/\n/g, ' ') || 'prompt'
    const thread = await channel.threads.create({
      name,
      type: ChannelType.PublicThread,
      reason: 'Prompt thread',
    })
    await deferEditReply(`已建立討論串：<#${thread.id}>`)

    processingThreadIds.add(thread.id)
    const statusMsgRef = { current: await thread.send(THINKING_LABEL) }

    try {
      const { success, error } = await runStreamWithThrottle(prompt, {
        thread,
        statusMsgRef,
        workspace,
        onSession: sessionId => void setSession(thread.id, sessionId, workspace),
      })

      if (!success)
        await thread.send(`❌ ${truncateForDiscord(error ?? 'Unknown error')}`).catch(() => {})
    }
    finally {
      processingThreadIds.delete(thread.id)
    }
  }

  /** Handle follow-up message in a thread that has a stored session (resume). */
  async function handleThreadFollowUp(
    thread: ThreadChannel,
    content: string,
    userId: string,
    session: { sessionId: string; workspace: string },
  ): Promise<void> {
    if (!rateLimiter.check(userId)) {
      await thread.send('⏱️ 請求過於頻繁，請稍後再試（每分鐘最多 5 次）。').catch(() => {})
      return
    }
    rateLimiter.record(userId)

    processingThreadIds.add(thread.id)
    const statusMsgRef = { current: await thread.send(THINKING_LABEL) }

    try {
      const { success, error } = await runStreamWithThrottle(content, {
        thread,
        statusMsgRef,
        workspace: session.workspace,
        sessionId: session.sessionId,
      })

      if (!success) {
        await deleteSession(thread.id)
        await thread.send(`❌ ${truncateForDiscord(error ?? 'Unknown error')}\n如需繼續對話，請在此討論串使用 \`/prompt\` 重新開始。`).catch(() => {})
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
      if (interaction.commandName === 'prompt') {
        const prompt = interaction.options.getString('prompt', true)
        const workspaceId = interaction.options.getString('workspace') ?? null
        const channel = interaction.channel
        if (!channel || !channel.isTextBased() || channel.isDMBased()) {
          await interaction.reply({ content: '此指令僅能在伺服器文字頻道使用。', ephemeral: true })
          return
        }
        const textChannel = channel as TextChannel
        if (!textChannel.threads) {
          await interaction.reply({ content: '此頻道無法建立討論串。', ephemeral: true })
          return
        }
        await interaction.deferReply()
        await handlePrompt(prompt, interaction.user.id, textChannel, async content => {
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
    console.error('無法連線到 Discord。若為 Connect Timeout，請檢查網路、防火牆或 VPN 是否阻擋對 Discord 的連線。')
    console.error(msg)
    process.exit(1)
  })
}

main()
