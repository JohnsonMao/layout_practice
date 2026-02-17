import { config as loadEnv } from 'dotenv'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * 從給定目錄往上找含 pnpm-workspace.yaml 的 repo 根目錄；
 * 找不到則回傳 startDir。
 */
export function findRepoRoot(startDir: string): string {
  let dir = resolve(startDir)
  while (!existsSync(resolve(dir, 'pnpm-workspace.yaml'))) {
    const parent = resolve(dir, '..')
    if (parent === dir)
      return startDir
    dir = parent
  }
  return dir
}

/**
 * 從 repo 根目錄載入 .env（由 process.cwd() 往上找 pnpm-workspace.yaml）。
 * 各 app 在讀取 process.env 前呼叫一次即可，無需重複實作。
 */
export function loadEnvFromRepoRoot(): void {
  const root = findRepoRoot(process.cwd())
  loadEnv({ path: resolve(root, '.env') })
}
