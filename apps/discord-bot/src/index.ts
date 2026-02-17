import { Client, Events, GatewayIntentBits } from 'discord.js'
import { createRelay } from '@agent-relay/core'
import { createCursorCliProvider } from '@agent-relay/provider-cursor-cli'
import { getConfig, truncateForDiscord } from './config'

function main(): void {
  const { token } = getConfig()

  const provider = createCursorCliProvider()
  const relay = createRelay({ provider })

  const client = new Client({ intents: [GatewayIntentBits.Guilds] })

  client.once(Events.ClientReady, (c) => {
    console.log(`Logged in as ${c.user.tag}.`)
  })

  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
      return
    if (interaction.commandName !== 'ask')
      return

    const prompt = interaction.options.getString('prompt', true)
    await interaction.deferReply()

    const response = await relay.run({ prompt })

    if (response.success) {
      const text = truncateForDiscord(response.result)
      await interaction.editReply(text)
    }
    else {
      const text = truncateForDiscord(`Error (${response.error.code}): ${response.error.message}`)
      await interaction.editReply(text)
    }
  })

  client.login(token)
}

main()
