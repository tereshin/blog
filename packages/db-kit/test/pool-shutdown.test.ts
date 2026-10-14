import { setTimeout as delay } from 'node:timers/promises'
import { describe, expect, it } from 'vitest'
import { createDb } from '../src/index.ts'
import { startPostgres } from '../src/testing.ts'

describe('пул при остановке PostgreSQL', () => {
  it('обрыв администратором после close не роняет процесс', async () => {
    const postgres = await startPostgres()
    const database = createDb({ url: postgres.url })
    await database.pool.query('select 1')
    await database.close()
    await postgres.stop()
    await delay(300)
    expect(database.pool.ending).toBe(true)
  }, 120_000)
})
