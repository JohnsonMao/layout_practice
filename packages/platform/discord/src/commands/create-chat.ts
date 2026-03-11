import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('create-chat')
  .setDescription('Create a thread to chat with AI')
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('Thread title')
      .setRequired(true),
  )
  .addStringOption(option =>
    option
      .setName('workspace')
      .setDescription('Absolute path to workspace (optional)')
      .setRequired(false),
  )
  .addStringOption(option =>
    option
      .setName('model')
      .setDescription('AI model ID (optional)')
      .setRequired(false),
  )
