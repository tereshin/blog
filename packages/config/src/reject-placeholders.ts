export const PLACEHOLDER = 'CHANGE_ME'

export class PlaceholderError extends Error {
  readonly key: string

  constructor(key: string) {
    super(`В prod значение ${key} осталось заглушкой ${PLACEHOLDER}`)
    this.name = 'PlaceholderError'
    this.key = key
  }
}

/**
 * В `prod` заглушка `CHANGE_ME` в перечисленных ключах роняет сервис с именем ключа.
 * Значения секретов в сообщение не попадают.
 */
export function rejectPlaceholders<TEnv extends { APP_ENV: string }>(
  env: TEnv,
  keys: readonly (keyof TEnv & string)[],
): void {
  if (env.APP_ENV !== 'prod') return
  for (const key of keys) {
    const value = env[key]
    if (typeof value === 'string' && value.includes(PLACEHOLDER)) {
      throw new PlaceholderError(key)
    }
  }
}
