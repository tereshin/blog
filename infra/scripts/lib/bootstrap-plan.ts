import { findPlaceholder } from './compose.ts'

export class BootstrapRefusedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BootstrapRefusedError'
  }
}

export type BootstrapStep = {
  service: string
  compose_args: string[]
}

/** Значение переменной из текста env-файла. Комментарии пропускаются. */
export function readEnvValue(env_text: string, key: string): string | null {
  for (const raw_line of env_text.split(/\r?\n/)) {
    const line = raw_line.trim()
    if (line === '' || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator === -1) continue
    if (line.slice(0, separator).trim() !== key) continue
    return line.slice(separator + 1).trim()
  }
  return null
}

/**
 * План `bootstrap` для prod: сначала identity, затем content.
 * Без файла, с заглушкой или без почты суперадминистратора контейнеры не планируются.
 */
export function planBootstrap(env_text: string): BootstrapStep[] {
  const placeholder = findPlaceholder(env_text)
  if (placeholder) {
    throw new BootstrapRefusedError(`infra/env/prod.env: значение ${placeholder} осталось заглушкой CHANGE_ME. bootstrap-prod отменён.`)
  }
  const email = readEnvValue(env_text, 'SUPERADMIN_EMAIL')
  if (!email) {
    throw new BootstrapRefusedError('SUPERADMIN_EMAIL не задан. bootstrap-prod отменён.')
  }
  return ['identity', 'content'].map((service) => ({
    service,
    compose_args: ['run', '--rm', '--no-deps', service, 'node', 'dist/bootstrap.js'],
  }))
}
