import { drizzle } from 'drizzle-orm/node-postgres'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import pg from 'pg'

export type DbPool = pg.Pool

export type DbHandle = {
  pool: DbPool
  db: NodePgDatabase
  /** Для `/health/ready`: база отвечает на `select 1`. */
  isReady: () => Promise<boolean>
  close: () => Promise<void>
}

export type CreateDbOptions = {
  url: string
  max_connections?: number
  /** Потолок одного запроса на уровне пула; `0` — без ограничения (только для одноразовых задач). */
  statement_timeout_ms?: number
}

export const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000

export function createDb(options: CreateDbOptions): DbHandle {
  const pool = new pg.Pool({
    connectionString: options.url,
    max: options.max_connections ?? 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 3_000,
    statement_timeout: options.statement_timeout_ms ?? DEFAULT_STATEMENT_TIMEOUT_MS,
  })
  return {
    pool,
    db: drizzle(pool),
    isReady: async () => {
      try {
        await pool.query('select 1')
        return true
      } catch {
        return false
      }
    },
    close: () => pool.end(),
  }
}
