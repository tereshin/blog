import { asc, gt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import type { Logger } from '@blog/logger'
import type { DbHandle } from '../db/client.ts'
import { profiles } from '../db/schema.ts'
import { createBadgeRepository, createBadgeService } from '../../modules/badge/index.ts'
import { createSettingsRepository, createSettingsService } from '../../modules/settings/index.ts'

const SWEEP_LOCK = 74192831
const INTERVAL_MS = 5 * 60 * 1000

export async function runBadgeSweep(
  database: DbHandle,
  should_stop = () => false,
  now = new Date(),
): Promise<void> {
  const client = await database.pool.connect()
  let locked = false
  try {
    const result = await client.query<{ locked: boolean }>(
      'select pg_try_advisory_lock($1) as locked',
      [SWEEP_LOCK],
    )
    locked = result.rows[0]?.locked ?? false
    if (!locked) return
    const db = drizzle(client)
    let cursor: string | undefined
    while (!should_stop()) {
      const rows = await db
        .select({ user_id: profiles.user_id })
        .from(profiles)
        .where(cursor ? gt(profiles.user_id, cursor) : undefined)
        .orderBy(asc(profiles.user_id))
        .limit(500)
      if (rows.length === 0) return
      await db.transaction(async (tx) => {
        const settings = createSettingsService(createSettingsRepository(tx), { media_url: '' })
        const service = createBadgeService(
          createBadgeRepository(tx as Database, settings.getBadgeDefinitions),
        )
        if (!should_stop())
          await service.evaluateMany(
            rows.map((row) => row.user_id),
            now,
          )
      })
      cursor = rows.at(-1)?.user_id
    }
  } finally {
    let release_error: Error | undefined
    try {
      if (locked) await client.query('select pg_advisory_unlock($1)', [SWEEP_LOCK])
    } catch (error) {
      // Destroy the connection so PostgreSQL releases its session lock.
      release_error = error instanceof Error ? error : new Error(String(error))
    }
    client.release(release_error)
  }
}

export function startBadgeWorker(database: DbHandle, logger: Logger) {
  let stopped = false
  let running: Promise<void> | undefined
  const run = () => {
    if (stopped || running) return
    running = runBadgeSweep(database, () => stopped)
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Badge sweep failed; retrying on next interval')
      })
      .finally(() => {
        running = undefined
      })
  }
  const timer = setInterval(run, INTERVAL_MS)
  timer.unref()
  run()
  return {
    async stop() {
      stopped = true
      clearInterval(timer)
      await running
    },
  }
}
