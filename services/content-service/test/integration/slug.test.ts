import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { releaseSlug, replaceSlug, reserveSlug, SlugTakenError } from '../../src/modules/slug/index.ts'

describe('slug: реестр адресов на PostgreSQL', () => {
  let postgres: TestPostgres
  let database: DbHandle

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
  }, 120_000)

  afterAll(async () => {
    await database.close()
    await postgres.stop()
  })

  it('два владельца одновременно просят один адрес: выигрывает ровно один', async () => {
    const results = await Promise.allSettled([
      database.db.transaction((tx) => reserveSlug(tx, 'race-slug', 'profile', crypto.randomUUID())),
      database.db.transaction((tx) => reserveSlug(tx, 'race-slug', 'article', crypto.randomUUID())),
    ])
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1)
    const rejected = results.find((result) => result.status === 'rejected')
    expect(rejected && 'reason' in rejected ? rejected.reason : null).toBeInstanceOf(SlugTakenError)
  })

  it('откат транзакции владельца освобождает адрес', async () => {
    await expect(
      database.db.transaction(async (tx) => {
        await reserveSlug(tx, 'rolled-back', 'topic', crypto.randomUUID())
        throw new Error('откат')
      }),
    ).rejects.toThrow('откат')
    await expect(database.db.transaction((tx) => reserveSlug(tx, 'rolled-back', 'topic', crypto.randomUUID()))).resolves.toBeUndefined()
  })

  it('смена и освобождение адреса работают через реестр', async () => {
    const owner = crypto.randomUUID()
    await database.db.transaction(async (tx) => {
      await reserveSlug(tx, 'first-slug', 'profile', owner)
      await replaceSlug(tx, 'second-slug', 'profile', owner)
    })
    const after_replace = await database.pool.query<{ slug: string }>('select slug from slugs where owner_id = $1', [owner])
    expect(after_replace.rows.map((row) => row.slug)).toEqual(['second-slug'])
    await database.db.transaction((tx) => releaseSlug(tx, 'profile', owner))
    expect((await database.pool.query('select 1 from slugs where owner_id = $1', [owner])).rowCount).toBe(0)
  })
})
