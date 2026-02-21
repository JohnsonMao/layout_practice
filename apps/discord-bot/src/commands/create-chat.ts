import { SlashCommandBuilder } from 'discord.js'
import { getWorkspaceChoiceIds } from '../workspace-config'

const workspaceChoices = getWorkspaceChoiceIds().map(id => ({ name: id, value: id }))

export const data = new SlashCommandBuilder()
  .setName('create-chat')
  .setDescription('建立一個乾淨的討論串，在此與 AI 對話（title 必填，workspace 選填）')
  .addStringOption(option =>
    option
      .setName('title')
      .setDescription('討論串標題')
      .setRequired(true),
  )
  .addStringOption(option => {
    const opt = option
      .setName('workspace')
      .setDescription('專案目錄（Cursor 工作目錄）；省略則使用預設')
      .setRequired(false)
    if (workspaceChoices.length > 0)
      opt.addChoices(...workspaceChoices)
    return opt
  })
