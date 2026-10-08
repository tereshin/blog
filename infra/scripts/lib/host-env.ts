/** Порты сервисов при запуске с хоста; те же, что в контейнерах. */
export const SERVICE_PORTS: Record<string, number> = {
  gateway: 3000,
  identity: 3001,
  content: 3002,
  discussion: 3003,
  messaging: 3004,
  notification: 3005,
  media: 3006,
}

/** Разбор dotenv без раскрытия переменных: значения с `\n` (PEM) остаются как есть. */
export function parseDotenv(text: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const raw_line of text.split(/\r?\n/)) {
    const line = raw_line.trim()
    if (line === '' || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator === -1) continue
    result[line.slice(0, separator).trim()] = line.slice(separator + 1)
  }
  return result
}

/**
 * Окружение процесса сервиса: все ключи файла, `DATABASE_URL` из `<SERVICE>_DATABASE_URL`,
 * `HTTP_PORT` из таблицы портов.
 */
export function hostEnvFor(service: string, values: Record<string, string>): Record<string, string> {
  const name = service.replace(/-service$/, '')
  const env: Record<string, string> = { ...values }
  const database_url = values[`${name.toUpperCase()}_DATABASE_URL`]
  if (database_url) env['DATABASE_URL'] = database_url
  const port = SERVICE_PORTS[name]
  if (port) env['HTTP_PORT'] = String(port)
  return env
}
