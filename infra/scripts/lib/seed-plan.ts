import { isEnvironment, UsageError } from './compose.ts'
import type { Environment } from './compose.ts'

/**
 * Порядок запуска одноразовых контейнеров seed (contracts/seed.md): `identity`, `content`, `discussion`,
 * затем `messaging`, `notification`, `media`. Последние три добавляются задачами своих разделов.
 */
export const SEED_SERVICES: readonly string[] = ['identity', 'content', 'discussion']

export const SEED_PROFILES = ['small', 'large'] as const
export type SeedProfile = (typeof SEED_PROFILES)[number]

export class SeedForbiddenError extends Error {
  constructor() {
    super('Тестовые данные в prod запрещены: seed завершён без запуска контейнеров. Для prod есть только `pnpm infra:bootstrap-prod`.')
    this.name = 'SeedForbiddenError'
  }
}

export type SeedRequest = { env: Environment; profile: SeedProfile; anchor: string | null }

export type SeedStep = {
  service: string
  /** Аргументы после `docker compose …`. */
  compose_args: string[]
}

/** `<env> <small|large> [--anchor=<ISO>]` (после `--` тоже). Для prod ошибка поднимается сразу, ничего не запускается. */
export function parseSeedRequest(argv: readonly string[]): SeedRequest {
  const [env, profile, ...rest] = argv
  if (!isEnvironment(env)) throw new UsageError(`Окружение должно быть local, dev или prod (получено: ${env ?? 'ничего'})`)
  if (env === 'prod') throw new SeedForbiddenError()
  if (!SEED_PROFILES.some((item) => item === profile)) throw new UsageError(`Профиль должен быть small или large (получено: ${profile ?? 'ничего'})`)
  let anchor: string | null = null
  for (let index = 0; index < rest.length; index += 1) {
    const arg = rest[index] ?? ''
    if (arg.startsWith('--anchor=')) anchor = arg.slice('--anchor='.length)
    else if (arg === '--anchor') {
      anchor = rest[index + 1] ?? null
      index += 1
    } else if (arg !== '--') throw new UsageError(`Неизвестный аргумент: ${arg}`)
  }
  if (anchor !== null && Number.isNaN(new Date(anchor).getTime())) throw new UsageError(`Некорректный --anchor: ${anchor}`)
  return { env, profile: profile as SeedProfile, anchor }
}

/** План: по одному одноразовому контейнеру на сервис, в порядке `SEED_SERVICES`. Стек уже поднят, зависимости не трогаем. */
export function planSeed(request: SeedRequest, services: readonly string[] = SEED_SERVICES): SeedStep[] {
  if (request.env === 'prod') throw new SeedForbiddenError()
  return services.map((service) => ({
    service,
    compose_args: [
      'run',
      '--rm',
      '--no-deps',
      service,
      'node',
      'dist/seed.js',
      '--profile',
      request.profile,
      ...(request.anchor ? [`--anchor=${request.anchor}`] : []),
    ],
  }))
}
