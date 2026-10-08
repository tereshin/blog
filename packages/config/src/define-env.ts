import { z } from 'zod'

export class EnvValidationError extends Error {
  readonly missing: string[]
  readonly invalid: string[]

  constructor(missing: string[], invalid: string[]) {
    const parts: string[] = []
    if (missing.length > 0) parts.push(`отсутствуют: ${missing.join(', ')}`)
    if (invalid.length > 0) parts.push(`некорректны: ${invalid.join(', ')}`)
    super(`Переменные окружения не прошли проверку (${parts.join('; ')})`)
    this.name = 'EnvValidationError'
    this.missing = missing
    this.invalid = invalid
  }
}

/**
 * Читает `source` (по умолчанию `process.env`), валидирует по схеме и падает с перечнем
 * отсутствующих и некорректных переменных. Единственное место, где сервис читает окружение.
 */
export function defineEnv<TSchema extends z.ZodType>(
  schema: TSchema,
  source: Record<string, string | undefined> = process.env,
): z.infer<TSchema> {
  const parsed = schema.safeParse(source)
  if (parsed.success) return parsed.data

  const missing = new Set<string>()
  const invalid = new Set<string>()
  for (const issue of parsed.error.issues) {
    const key = String(issue.path[0] ?? '')
    if (key === '') continue
    if (source[key] === undefined) missing.add(key)
    else invalid.add(key)
  }
  throw new EnvValidationError([...missing].sort(), [...invalid].sort())
}
