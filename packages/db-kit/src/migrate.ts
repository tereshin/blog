import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import type pg from 'pg'

export type MigrationLogger = { info: (message: string) => void }

export type RunMigrationsOptions = {
  pool: pg.Pool
  /** Папка с `<timestamp>_<действие>.sql`; порядок применения — по имени файла. */
  dir: string
  logger?: MigrationLogger
}

export type MigrationFile = { name: string; sql: string }

// Произвольное постоянное число: один мигратор на базу в любой момент.
const ADVISORY_LOCK_KEY = 7_302_026

export function listMigrations(dir: string): MigrationFile[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }))
}

/**
 * Применяет ещё не применённые миграции. Каждая — в своей транзакции; применённые записываются в
 * `schema_migrations`. Повторный запуск ничего не меняет. Запускается одноразовой задачей Compose,
 * не на старте реплик.
 */
export async function runMigrations(options: RunMigrationsOptions): Promise<string[]> {
  const client = await options.pool.connect()
  const applied: string[] = []
  try {
    await client.query('select pg_advisory_lock($1)', [ADVISORY_LOCK_KEY])
    await client.query(
      'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())',
    )
    const done = new Set((await client.query<{ name: string }>('select name from schema_migrations')).rows.map((row) => row.name))
    for (const migration of listMigrations(options.dir)) {
      if (done.has(migration.name)) continue
      try {
        await client.query('begin')
        await client.query(migration.sql)
        await client.query('insert into schema_migrations (name) values ($1)', [migration.name])
        await client.query('commit')
      } catch (error) {
        await client.query('rollback')
        throw new Error(`Миграция ${migration.name} не применена: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
      }
      applied.push(migration.name)
      options.logger?.info(`применена миграция ${migration.name}`)
    }
  } finally {
    await client.query('select pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined)
    client.release()
  }
  return applied
}
