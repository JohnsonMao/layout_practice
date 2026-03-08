import { REST, Routes } from 'discord.js'
import { getConfig } from './config'
import { commands as commandList } from './commands/index'

async function deploy(): Promise<void> {
  const { token, clientId, guildId } = getConfig()

  const commands = commandList.map(c => c.toJSON())

  const rest = new REST().setToken(token)

  if (guildId) {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    )
    console.log(`Registered ${commands.length} command(s) for guild ${guildId}.`)
  }
  else {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    )
    console.log(`Registered ${commands.length} command(s) globally.`)
  }
}

deploy().catch(err => {
  console.error(err)
  process.exit(1)
})
