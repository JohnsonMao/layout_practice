import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { config as loadEnv } from 'dotenv'

/**
 * Walk up from the given directory to find the repo root containing pnpm-workspace.yaml;
 * returns startDir if not found.
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
 * Load .env from repo root (found by walking up from process.cwd() for pnpm-workspace.yaml).
 * Call once per app before reading process.env; no need to duplicate in each app.
 */
export function loadEnvFromRepoRoot(): void {
  const root = findRepoRoot(process.cwd())
  loadEnv({ path: resolve(root, '.env') })
}
