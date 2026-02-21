import { SlashCommandBuilder } from 'discord.js'
import { getWorkspaceChoiceIds } from '../workspace-config'

const workspaceChoices = getWorkspaceChoiceIds().map(id => ({ name: id, value: id }))

export const data = new SlashCommandBuilder()
  .setName('create-chat')
  .setDescription('Create a thread to chat with AI (title required, workspace optional)')
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('Thread title')
      .setRequired(true),
  )
  .addStringOption(option => {
    const opt = option
      .setName('workspace')
      .setDescription('Project directory (workspace); omit for default')
      .setRequired(false)
    if (workspaceChoices.length > 0)
      opt.addChoices(...workspaceChoices)
    return opt
  })
