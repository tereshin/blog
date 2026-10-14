import { createDb } from '@blog/db-kit'
import type { DbHandle } from '@blog/db-kit'

export type { DbHandle }

export type OpenDatabaseOptions = { statement_timeout_ms?: number }

/** Пул сервиса; одноразовые задачи (migrate, seed, bootstrap) снимают `statement_timeout` явно. */
export function openDatabase(url: string, options: OpenDatabaseOptions = {}): DbHandle {
  return createDb({ url, ...options })
}
