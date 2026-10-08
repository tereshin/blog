import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildComposeArgs, envFilePath } from './compose.ts'
import type { Environment } from './compose.ts'

export const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')

export class CommandError extends Error {
  readonly exit_code: number

  constructor(message: string, exit_code = 1) {
    super(message)
    this.name = 'CommandError'
    this.exit_code = exit_code
  }
}

export function readEnvFile(env: Environment): string {
  const path = resolve(REPO_ROOT, envFilePath(env))
  if (!existsSync(path)) {
    throw new CommandError(
      `Нет файла ${envFilePath(env)}. Скопируйте шаблон: cp infra/env/${env}.env.example infra/env/${env}.env — и заполните значения.`,
    )
  }
  return readFileSync(path, 'utf8')
}

/** Запускает `docker compose` из корня репозитория; вывод — в терминал. */
export function compose(env: Environment, args: string[], options: { capture?: boolean } = {}): { code: number; stdout: string } {
  const result = spawnSync('docker', ['compose', ...buildComposeArgs(env), ...args], {
    cwd: REPO_ROOT,
    stdio: options.capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })
  if (result.error) throw new CommandError(`Не удалось запустить docker: ${result.error.message}`)
  return { code: result.status ?? 1, stdout: options.capture ? String(result.stdout) : '' }
}

export async function waitForHttp(url: string, timeout_ms: number): Promise<boolean> {
  const deadline = Date.now() + timeout_ms
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) return true
    } catch {
      // сервис ещё не принимает соединения
    }
    await new Promise((resolve_timer) => setTimeout(resolve_timer, 1000))
  }
  return false
}
