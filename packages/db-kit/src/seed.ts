import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { PgInsertValue, PgTable } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { Logger } from '@blog/logger'
import { resolveAnchor } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { DbHandle } from './pool.ts'

export const SEED_BATCH_SIZE = 1000

/** Seed запрещён в `prod` целиком: ошибка поднимается до открытия соединения на запись. */
export class SeedForbiddenError extends Error {
  constructor() {
    super('Тестовые данные в prod запрещены (APP_ENV=prod): ничего не записано')
    this.name = 'SeedForbiddenError'
  }
}

export function assertSeedAllowed(app_env: string | undefined): void {
  if (app_env === 'prod') throw new SeedForbiddenError()
}

export type SeedArgs = { profile: SeedProfileName; anchor_flag: string | undefined }

/** `--profile small|large [--anchor=<ISO>]` (флаг можно передать и как `--anchor <ISO>`). */
export function parseSeedArgs(argv: readonly string[]): SeedArgs {
  let profile: string | undefined
  let anchor_flag: string | undefined
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index] ?? ''
    if (arg === '--profile') profile = argv[(index += 1)]
    else if (arg.startsWith('--profile=')) profile = arg.slice('--profile='.length)
    else if (arg === '--anchor') anchor_flag = argv[(index += 1)]
    else if (arg.startsWith('--anchor=')) anchor_flag = arg.slice('--anchor='.length)
  }
  if (profile !== 'small' && profile !== 'large') throw new Error('Нужен --profile small|large')
  return { profile, anchor_flag }
}

export type InsertStats = { table: string; inserted: number; skipped: number }

/**
 * Пишет строки пачками по `SEED_BATCH_SIZE` без общей транзакции: при обрыве прежние пачки сохраняются.
 * Строка, которая уже есть (тот же ключ) или упирается в уникальное поле чужой строки, пропускается.
 */
export async function insertInBatches<T extends PgTable>(
  db: NodePgDatabase,
  table: T,
  rows: readonly PgInsertValue<T>[],
  options: { label: string; logger: Logger },
): Promise<InsertStats> {
  let inserted = 0
  for (let offset = 0; offset < rows.length; offset += SEED_BATCH_SIZE) {
    const chunk = rows.slice(offset, offset + SEED_BATCH_SIZE)
    const written = await db.insert(table).values(chunk).onConflictDoNothing().returning({ written: sql<number>`1` })
    inserted += written.length
  }
  const stats = { table: options.label, inserted, skipped: rows.length - inserted }
  options.logger.info(stats, 'seed: таблица записана')
  return stats
}

export type SeedContext = { anchor: Date; db: NodePgDatabase; handle: DbHandle }

export type RunSeedOptions = {
  handle: DbHandle
  profile: SeedProfileName
  anchor_flag: string | undefined
  logger: Logger
  now?: () => Date
  write: (context: SeedContext) => Promise<void>
}

/**
 * Каркас запуска seed одного сервиса: якорь из `seed_runs`, иначе из флага, иначе начало суток UTC;
 * строка `seed_runs` создаётся до записи, `finished_at` ставится после. Оборванный запуск доделывается следующим.
 */
export async function runSeed(options: RunSeedOptions): Promise<{ anchor: Date }> {
  const { handle, profile, logger } = options
  const now = (options.now ?? (() => new Date()))()
  const recorded = await handle.pool.query<{ anchor_at: Date }>('select anchor_at from seed_runs order by started_at limit 1')
  const anchor = resolveAnchor({ recorded: recorded.rows[0]?.anchor_at, flag: options.anchor_flag, now })

  await handle.pool.query(
    'insert into seed_runs (profile, anchor_at, started_at, finished_at) values ($1, $2, $3, null) on conflict (profile) do nothing',
    [profile, anchor, now],
  )
  logger.info({ profile, anchor: anchor.toISOString() }, 'seed: старт')
  await options.write({ anchor, db: handle.db, handle })
  await handle.pool.query('update seed_runs set finished_at = $2 where profile = $1 and finished_at is null', [profile, now])
  logger.info({ profile }, 'seed: готово')
  return { anchor }
}
