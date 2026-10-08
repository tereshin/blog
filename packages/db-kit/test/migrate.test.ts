import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createDb, runMigrations } from '../src/index.ts'
import { startPostgres } from '../src/testing.ts'
import type { TestPostgres } from '../src/testing.ts'

const dir = join(import.meta.dirname, 'migrations')

describe('runMigrations (PostgreSQL в контейнере)', () => {
  let postgres: TestPostgres
  beforeAll(async () => {
    postgres = await startPostgres()
  }, 120_000)
  afterAll(async () => {
    await postgres.stop()
  })

  it('применяет миграции по порядку и повторный запуск ничего не меняет', async () => {
    const handle = createDb({ url: postgres.url })
    try {
      const first = await runMigrations({ pool: handle.pool, dir })
      expect(first).toEqual(['001_a.sql', '002_b.sql'])
      const second = await runMigrations({ pool: handle.pool, dir })
      expect(second).toEqual([])
      expect(await handle.isReady()).toBe(true)
    } finally {
      await handle.close()
    }
  })
})
