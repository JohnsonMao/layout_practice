import { loadEnvFromRepoRoot } from '@agent-relay/core'

loadEnvFromRepoRoot()

const DISCORD_TOKEN = process.env.DISCORD_TOKEN
const CLIENT_ID = process.env.DISCORD_CLIENT_ID ?? process.env.CLIENT_ID
const GUILD_ID = process.env.DISCORD_GUILD_ID ?? process.env.GUILD_ID

export function getConfig(): { token: string, clientId: string, guildId: string | undefined } {
  if (!DISCORD_TOKEN) {
    console.error('Missing DISCORD_TOKEN. Set it in the environment.')
    process.exit(1)
  }
  if (!CLIENT_ID) {
    console.error('Missing DISCORD_CLIENT_ID (or CLIENT_ID). Set it in the environment.')
    process.exit(1)
  }
  return {
    token: DISCORD_TOKEN,
    clientId: CLIENT_ID,
    guildId: GUILD_ID,
  }
}

export const DISCORD_MESSAGE_MAX_LENGTH = 2000
const TRUNCATE_SUFFIX = '\n\n… (truncated)'

export function truncateForDiscord(text: string, maxLength: number = DISCORD_MESSAGE_MAX_LENGTH): string {
  if (text.length <= maxLength)
    return text
  return text.slice(0, maxLength - TRUNCATE_SUFFIX.length) + TRUNCATE_SUFFIX
}
