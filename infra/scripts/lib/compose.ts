export const ENVIRONMENTS = ['local', 'dev', 'prod'] as const
export type Environment = (typeof ENVIRONMENTS)[number]

export const PLACEHOLDER = 'CHANGE_ME'

export const SERVICES_WITH_DB = ['identity', 'content', 'discussion', 'messaging', 'notification', 'media'] as const
export const ALL_SERVICES = ['gateway', ...SERVICES_WITH_DB] as const

export function isEnvironment(value: string | undefined): value is Environment {
  return ENVIRONMENTS.some((item) => item === value)
}

export function envFilePath(env: Environment): string {
  return `infra/env/${env}.env`
}

/** Аргументы `docker compose`: база + файл окружения + env-файл. Запускаются из корня репозитория. */
export function buildComposeArgs(env: Environment): string[] {
  return [
    '-f',
    'infra/compose/docker-compose.yml',
    '-f',
    `infra/compose/docker-compose.${env}.yml`,
    '--env-file',
    envFilePath(env),
  ]
}

/** Имя первой переменной, значение которой содержит заглушку; комментарии пропускаются. */
export function findPlaceholder(env_text: string): string | null {
  for (const raw_line of env_text.split(/\r?\n/)) {
    const line = raw_line.trim()
    if (line === '' || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator === -1) continue
    const name = line.slice(0, separator).trim()
    const value = line.slice(separator + 1)
    if (value.includes(PLACEHOLDER)) return name
  }
  return null
}

/** `mock-google` в составе `prod` запрещён: проверяется по выводу `docker compose config --services`. */
export function hasMockGoogle(services_output: string): boolean {
  return services_output.split(/\s+/).includes('mock-google')
}

function isServiceWithDb(name: string): name is (typeof SERVICES_WITH_DB)[number] {
  return SERVICES_WITH_DB.some((item) => item === name)
}

/**
 * Выбранные сервисы плюс всё, без чего они не запустятся при `--no-deps`: их базы, NATS, MinIO,
 * одноразовые `<service>-migrate`, а для `media` ещё и `minio-init`.
 */
export function expandServices(selected: readonly string[]): string[] {
  const result = new Set<string>(['nats', 'minio'])
  for (const name of selected) {
    result.add(name)
    if (isServiceWithDb(name)) {
      result.add(`${name}-db`)
      result.add(`${name}-migrate`)
    }
    if (name === 'media') result.add('minio-init')
  }
  return [...result]
}

export type ParsedArgs = {
  env: Environment
  services: string[] | null
  volumes: boolean
  rest: string[]
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}

/** `<env> [--services a,b] [--volumes] [остальное]`; ошибки — `UsageError` с понятным текстом. */
export function parseArgs(argv: readonly string[]): ParsedArgs {
  const [env, ...options] = argv
  if (!isEnvironment(env)) {
    throw new UsageError(`Окружение должно быть одним из: ${ENVIRONMENTS.join(', ')} (получено: ${env ?? 'ничего'})`)
  }
  let services: string[] | null = null
  let volumes = false
  const rest: string[] = []
  for (let index = 0; index < options.length; index += 1) {
    const option = options[index] as string
    if (option === '--') continue
    if (option === '--volumes') volumes = true
    else if (option === '--services') {
      const value = options[index + 1]
      if (!value) throw new UsageError('--services требует список через запятую')
      services = value.split(',').filter(Boolean)
      index += 1
    } else if (option.startsWith('--services=')) {
      services = option.slice('--services='.length).split(',').filter(Boolean)
    } else rest.push(option)
  }
  return { env, services, volumes, rest }
}
