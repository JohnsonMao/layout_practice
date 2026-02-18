import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
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
import type { StreamChunk } from '@agent-relay/core'
import { getConfig, truncateForDiscord, DISCORD_MESSAGE_MAX_LENGTH } from './config'
import { createRateLimiter } from './rate-limit'
import {
  appendThreadMessage,
  buildPromptFromHistory,
  getThreadCwd,
  getThreadHistory,
  registerThread,
} from './thread-workspace'
import { getWorkspacePath } from './workspace-config'

const STREAM_THROTTLE_MS = 2000
const RATE_LIMIT_PER_MIN = 5

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
  })

  client.once(Events.ClientReady, c => {
    console.log(`Logged in as ${c.user.tag}.`)
  })

  /** Send long text as one or more messages (split by 2000). */
  async function sendLongContent(channel: ThreadChannel, text: string): Promise<Message[]> {
    const out: Message[] = []
    for (let i = 0; i < text.length; i += DISCORD_MESSAGE_MAX_LENGTH) {
      const chunk = text.slice(i, i + DISCORD_MESSAGE_MAX_LENGTH)
      const msg = await channel.send(chunk)
      out.push(msg)
    }
    return out
  }

  /** Run stream with 2s throttle; update `updateMessage` with accumulated text; on tool_call call `onToolCall`. */
  async function runStreamWithThrottle(
    prompt: string,
    updateMessage: (content: string) => Promise<void>,
    onToolCall: (chunk: Extract<StreamChunk, { type: 'tool_call' }>) => Promise<void>,
    cwd?: string,
  ): Promise<{ success: boolean; fullText: string; error?: string }> {
    let buffer = ''
    let lastEdit = 0
    let fullText = ''
    let done = false
    let errorMsg: string | undefined

    const flush = async (force = false) => {
      const now = Date.now()
      if (!force && now - lastEdit < STREAM_THROTTLE_MS && !done)
        return
      lastEdit = now
      if (buffer.length > 0)
        await updateMessage(truncateForDiscord(buffer))
    }

    const request = { prompt, ...(cwd !== undefined && cwd !== '' && { cwd }) }
    for await (const chunk of relay.runStream(request)) {
      if (chunk.type === 'text') {
        buffer += chunk.text
        fullText += chunk.text
        await flush()
      }
      if (chunk.type === 'tool_call') {
        await flush(true)
        await onToolCall(chunk)
      }
      if (chunk.type === 'done') {
        done = true
        await flush(true)
        break
      }
      if (chunk.type === 'error') {
        done = true
        errorMsg = `${chunk.error.code}: ${chunk.error.message}`
        await flush(true)
        break
      }
    }
    return { success: !errorMsg, fullText, error: errorMsg }
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

    const cwd = (workspaceId && getWorkspacePath(workspaceId)) ?? process.cwd()
    const name = prompt.slice(0, 100).replace(/\n/g, ' ') || 'prompt'
    const thread = await channel.threads.create({
      name,
      type: ChannelType.PublicThread,
      reason: 'Prompt thread',
    })
    registerThread(thread.id, cwd)
    await deferEditReply(`已建立討論串：<#${thread.id}>`)

    const statusMsg = await thread.send('⏳ 正在處理…')
    const updateStatus = async (content: string) => {
      await statusMsg.edit(content || '⏳ 正在處理…').catch(() => {})
    }

    const onToolCall = async (chunk: Extract<StreamChunk, { type: 'tool_call' }>) => {
      const label = [chunk.name, chunk.args].filter(Boolean).join(' ')
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`tool_approve:${chunk.toolCallId ?? ''}`)
          .setLabel('核准')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`tool_reject:${chunk.toolCallId ?? ''}`)
          .setLabel('拒絕')
          .setStyle(ButtonStyle.Danger),
      )
      await thread.send({
        content: `🔧 **工具呼叫**${label ? `: ${label}` : ''}\n請選擇核准或拒絕。`,
        components: [row],
      })
    }

    const { success, fullText, error } = await runStreamWithThrottle(
      prompt,
      updateStatus,
      onToolCall,
      cwd,
    )

    if (success) {
      appendThreadMessage(thread.id, 'user', prompt)
      appendThreadMessage(thread.id, 'assistant', fullText)
      const displayText = fullText.trim() || '（完成，無文字輸出）'
      if (displayText.length <= DISCORD_MESSAGE_MAX_LENGTH)
        await statusMsg.edit(truncateForDiscord(displayText)).catch(() => {})
      else
        await statusMsg.delete().catch(() => {}) && await sendLongContent(thread, fullText)
    }
    else {
      await statusMsg.edit(`❌ ${truncateForDiscord(error ?? 'Unknown error')}`).catch(() => {})
    }
  }

  /** Handle follow-up message in a registered thread. */
  async function handleThreadFollowUp(
    thread: ThreadChannel,
    content: string,
    userId: string,
  ): Promise<void> {
    if (!rateLimiter.check(userId)) {
      await thread.send('⏱️ 請求過於頻繁，請稍後再試（每分鐘最多 5 次）。').catch(() => {})
      return
    }
    rateLimiter.record(userId)

    const history = getThreadHistory(thread.id)
    const prompt = buildPromptFromHistory(history, content)
    appendThreadMessage(thread.id, 'user', content)

    const statusMsg = await thread.send('⏳ 正在處理…')
    const updateStatus = async (text: string) => {
      await statusMsg.edit(text || '⏳ 正在處理…').catch(() => {})
    }
    const onToolCall = async (chunk: Extract<StreamChunk, { type: 'tool_call' }>) => {
      const label = [chunk.name, chunk.args].filter(Boolean).join(' ')
      const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`tool_approve:${chunk.toolCallId ?? ''}`)
          .setLabel('核准')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`tool_reject:${chunk.toolCallId ?? ''}`)
          .setLabel('拒絕')
          .setStyle(ButtonStyle.Danger),
      )
      await thread.send({
        content: `🔧 **工具呼叫**${label ? `: ${label}` : ''}\n請選擇核准或拒絕。`,
        components: [row],
      })
    }

    const cwd = getThreadCwd(thread.id)
    const { success, fullText, error } = await runStreamWithThrottle(
      prompt,
      updateStatus,
      onToolCall,
      cwd,
    )

    if (success) {
      appendThreadMessage(thread.id, 'assistant', fullText)
      const displayText = fullText.trim() || '（完成，無文字輸出）'
      if (displayText.length <= DISCORD_MESSAGE_MAX_LENGTH)
        await statusMsg.edit(truncateForDiscord(displayText)).catch(() => {})
      else
        await statusMsg.delete().catch(() => {}) && await sendLongContent(thread, fullText)
    }
    else {
      await statusMsg.edit(`❌ ${truncateForDiscord(error ?? 'Unknown error')}`).catch(() => {})
    }
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

    if (interaction.isButton()) {
      const [action] = interaction.customId.split(':')
      if (action === 'tool_approve') {
        await interaction.reply({ content: '✅ 已核准', ephemeral: true })
        return
      }
      if (action === 'tool_reject') {
        await interaction.reply({ content: '❌ 已拒絕', ephemeral: true })
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
    const history = getThreadHistory(thread.id)
    if (history.length === 0)
      return
    const content = message.content?.trim()
    if (!content || content.startsWith('/'))
      return
    await handleThreadFollowUp(thread, content, message.author.id)
  })

  client.login(token)
}

main()
