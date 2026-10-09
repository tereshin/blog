const SECRET_KEY = /authorization|cookie|password|token|secret|session/i

/** Убирает секреты из объекта, который уйдёт в границу ошибок или мониторинг. */
export function scrubSensitive(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => scrubSensitive(item))
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) ? '[redacted]' : scrubSensitive(item)]),
    )
  }
  if (typeof value === 'string') return value.replace(/bearer\s+\S+/gi, 'Bearer [redacted]')
  return value
}

/** Точка, куда граница ошибок отдаёт уже очищенный отчёт. Приёмник подключает мониторинг. */
const reports: unknown[] = []

export function reportClientError(payload: unknown): void {
  reports.push(scrubSensitive(payload))
}

export function clientErrorReports(): readonly unknown[] {
  return reports
}
