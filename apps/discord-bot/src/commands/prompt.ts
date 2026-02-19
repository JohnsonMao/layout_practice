import { SlashCommandBuilder } from 'discord.js'
import { getWorkspaceChoiceIds } from '../workspace-config'

const workspaceChoices = getWorkspaceChoiceIds().map(id => ({ name: id, value: id }))

export const data = new SlashCommandBuilder()
  .setName('prompt')
  .setDescription('Create a thread and stream AI response (Cursor CLI). Continue in thread to keep context.')
  .addStringOption(option =>
    option
      .setName('prompt')
      .setDescription('Your prompt for the AI')
      .setRequired(true),
  )
  .addStringOption(option => {
    const opt = option
      .setName('workspace')
      .setDescription('Project directory (Cursor working directory); omit to use default')
      .setRequired(false)
    if (workspaceChoices.length > 0)
      opt.addChoices(...workspaceChoices)
    return opt
  })
