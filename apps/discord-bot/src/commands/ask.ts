import { SlashCommandBuilder } from 'discord.js'

export const data = new SlashCommandBuilder()
  .setName('ask')
  .setDescription('Send a prompt to the AI (Cursor CLI) and get a response.')
  .addStringOption(option =>
    option
      .setName('prompt')
      .setDescription('Your prompt for the AI')
      .setRequired(true),
  )
