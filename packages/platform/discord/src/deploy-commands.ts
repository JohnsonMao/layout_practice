import { REST, Routes } from 'discord.js'
import { commands as commandList } from './commands/index'
import { getConfig } from './config'

async function deploy(): Promise<void> {
  const { token, clientId, guildId } = getConfig()

  const commands = commandList.map(c => c.toJSON())

  const rest = new REST().setToken(token)

  if (guildId) {
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    )
    process.stdout.write(`Registered ${commands.length} command(s) for guild ${guildId}.\n`)
  }
  else {
    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands },
    )
    process.stdout.write(`Registered ${commands.length} command(s) globally.\n`)
  }
}

deploy().catch((err) => {
  console.error(err)
  process.exit(1)
})
