import { readFile } from 'node:fs/promises'
import Fastify from 'fastify'
import type { FastifyInstance } from 'fastify'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PROFILE_BADGES } from '../../src/shared/profile-badges.ts'
import type { BadgeDefinition, ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { errorHandler, requestContext } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import {
  articles,
  profile_badge_awards,
  profiles,
  settings,
  topics,
  users_copy,
} from '../../src/infra/db/schema.ts'
import { composeContent } from '../../src/app.modules.ts'
import { runBadgeSweep } from '../../src/infra/workers/badge-worker.ts'
import { ArticleRepository, ArticleWriteService } from '../../src/modules/article/index.ts'
import { BadgeRepository, BadgeService } from '../../src/modules/badge/index.ts'
import { CountersHandler } from '../../src/modules/counters/index.ts'
import { profileRoutes } from '../../src/modules/profile/index.ts'
import { settingsRoutes } from '../../src/modules/settings/index.ts'
import { SlugRepository, SlugService } from '../../src/modules/slug/index.ts'
import { SocialCoverRepository, SocialCoverService } from '../../src/modules/social-cover/index.ts'

const USER = '11111111-1111-4111-8111-111111111111'
const TOPIC = '22222222-2222-4222-8222-222222222222'
const ARTICLE = '33333333-3333-4333-8333-333333333333'
const BADGE = '44444444-4444-4444-8444-444444444444'
const now = new Date('2026-10-14T12:00:00Z')
const custom: BadgeDefinition = {
  id: BADGE,
  label: 'Veteran',
  image_url: 'http://media.test/badge.png',
  status: 'active',
  trigger: { metric: 'membership_months', threshold: 12 },
}

describe('permanent badge awards and settings', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  const awards = async () =>
    (await database.db.select().from(profile_badge_awards)).map((row) => row.badge_id).sort()
  const save = (body: object, role = 'superadmin') => {
    const payload = Object.fromEntries(Object.entries(body).filter(([key]) => key !== 'public_origin'))
    return app.inject({ method: 'PUT', url: '/v1/settings', headers: { 'x-role': role }, payload })
  }
  const admin = async () =>
    (await app.inject({ url: '/v1/settings/admin', headers: { 'x-role': 'superadmin' } })).json()

  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    await database.db
      .insert(users_copy)
      .values({ user_id: USER, public_number: 1, created_at: new Date('2020-01-01') })
    await database.db
      .insert(profiles)
      .values({ user_id: USER, display_name: 'Author', reputation: 10 })
    await database.db.insert(topics).values({ id: TOPIC, title: 'Topic', slug: 'topic' })
    await database.db
      .insert(articles)
      .values({
        id: ARTICLE,
        author_id: USER,
        topic_id: TOPIC,
        title: 'Post',
        slug: 'post',
        status: 'published',
        blocks: { blocks: [{ type: 'paragraph', data: { text: 'Post' } }] },
      })
    // Recreate the pre-upgrade shape with existing user achievements.
    await database.pool.query(
      'drop table profile_badge_awards; alter table settings drop column profile_badges',
    )
    const migration = await readFile(
      new URL('../../src/infra/db/migrations/20261014_profile_badges.sql', import.meta.url),
      'utf8',
    )
    await database.pool.query(migration)
    expect(await awards()).toEqual(['first_post', 'one_year', 'ten_reactions'])
    await database.db.insert(settings).values({ id: 1, name: 'Blog' })
    app = Fastify()
    await app.register(requestContext, {
      logger: createLogger({ service: 'test', level: 'silent' }),
    })
    await app.register(errorHandler)
    app.addHook('onRequest', async (request) => {
      const role = request.headers['x-role'] === 'superadmin' ? 'superadmin' : 'admin'
      request.viewer = {
        user_id: USER,
        role,
        is_restricted: false,
        can_publish: true,
        viewer_key: `user:${USER}`,
      } satisfies ServiceContext
    })
    const modules = composeContent({ database, media_url: 'http://media.test', public_origin: 'http://blog.test' })
    await app.register(settingsRoutes, { controller: modules.settings })
    await app.register(profileRoutes, { controller: modules.profile })
  }, 120000)

  beforeEach(async () => {
    await database.db.delete(profile_badge_awards)
    await database.db.update(settings).set({ profile_badges: DEFAULT_PROFILE_BADGES })
    await database.db.update(profiles).set({ reputation: 0 })
    await database.db.update(articles).set({ status: 'draft' })
  })
  afterAll(async () => {
    await app?.close()
    await database?.close()
    await postgres?.stop()
  })

  it('issues after publication and reputation update in their transactions, retaining awards', async () => {
    const service = new ArticleWriteService(
      new ArticleRepository(database.db),
      new SlugService(new SlugRepository()),
      new SocialCoverService(new SocialCoverRepository()),
      new BadgeService(new BadgeRepository()),
      { media_urls: ['http://media.test'], lookupFile: async () => null },
    )
    await service.publish({ user_id: USER, role: 'member', email_verified: true, is_restricted: false, can_publish: true, viewer_key: `user:${USER}` }, ARTICLE, 'test')
    expect(await awards()).toContain('first_post')
    await database.db.transaction(async (tx) => {
      await new CountersHandler().handle(tx, {
        user_id: USER,
        reputation: 10,
        event_id: '55555555-5555-4555-8555-555555555555',
        name: 'discussion.reputation.updated',
        occurred_at: now.toISOString(),
        correlation_id: 't',
        causation_id: null,
        version: 1,
      })
    })
    expect(await awards()).toContain('ten_reactions')
    await database.db.update(articles).set({ status: 'deleted' })
    await database.db.update(profiles).set({ reputation: 0 })
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toEqual(['first_post', 'one_year', 'ten_reactions'])
  })

  it('rolls back awards with the source transaction', async () => {
    await expect(
      database.db.transaction(async (tx) => {
        await tx.update(profiles).set({ reputation: 10 })
        await new BadgeService(new BadgeRepository()).evaluate(tx, USER, now)
        throw new Error('rollback')
      }),
    ).rejects.toThrow('rollback')
    expect(await awards()).toEqual([])
  })

  it('applies new rules retroactively, survives archive and edits, and preserves unspecified settings', async () => {
    let body = await admin()
    expect(
      (await save({ ...body, profile_badges: [...body.profile_badges, custom] })).statusCode,
    ).toBe(200)
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toContain(BADGE)
    body = await admin()
    const updated = body.profile_badges.map((badge: BadgeDefinition) => ({
      ...badge,
      label: 'Changed',
      status: 'archived',
      trigger: { ...badge.trigger, threshold: 1000 },
    }))
    expect((await save({ ...body, profile_badges: updated })).statusCode).toBe(200)
    await runBadgeSweep(database, () => false, now)
    const profile = (await app.inject('/v1/profiles/1')).json()
    expect(profile.badges).toContain(BADGE)
    const partial_body = await admin()
    delete partial_body.profile_badges
    expect((await save({ ...partial_body, name: 'Renamed' })).statusCode).toBe(200)
    expect((await admin()).profile_badges).toEqual(updated)
  })

  it('issues lowered and restored rules, but not archived rules', async () => {
    const body = await admin()
    await save({
      ...body,
      profile_badges: [...body.profile_badges, { ...custom, status: 'archived' }],
    })
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).not.toContain(BADGE)
    await save({
      ...body,
      profile_badges: [
        ...body.profile_badges,
        { ...custom, trigger: { ...custom.trigger, threshold: 1000 } },
      ],
    })
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).not.toContain(BADGE)
    await save({ ...body, profile_badges: [...body.profile_badges, custom] })
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toContain(BADGE)
  })

  it('is idempotent across concurrent issuance and repeated sweeps', async () => {
    await database.db.update(profiles).set({ reputation: 10 })
    await Promise.all(
      Array.from({ length: 3 }, () =>
        database.db.transaction((tx) => new BadgeService(new BadgeRepository()).evaluate(tx, USER, now)),
      ),
    )
    await Promise.all([
      runBadgeSweep(database, () => false, now),
      runBadgeSweep(database, () => false, now),
    ])
    expect(await awards()).toEqual(['one_year', 'ten_reactions'])
    const before = await database.db.select().from(profile_badge_awards)
    await runBadgeSweep(database, () => false, now)
    expect(await database.db.select().from(profile_badge_awards)).toEqual(before)
  })

  it('skips locked sweeps and releases the lock on stop', async () => {
    const client = await database.pool.connect()
    try {
      await client.query('select pg_advisory_lock(74192831)')
      await runBadgeSweep(database, () => false, now)
      expect(await awards()).toEqual([])
    } finally {
      await client.query('select pg_advisory_unlock(74192831)')
      client.release()
    }
    await runBadgeSweep(database, () => true, now)
    expect(await awards()).toEqual([])
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toEqual(['one_year'])
  })

  it('restricts settings to superadmin and validates images, thresholds and deletion', async () => {
    const body = await admin()
    expect((await save(body, 'admin')).statusCode).toBe(403)
    expect(
      (
        await save({
          ...body,
          profile_badges: [
            ...body.profile_badges,
            { ...custom, image_url: 'https://other.test/image.png' },
          ],
        })
      ).statusCode,
    ).toBe(422)
    expect(
      (
        await save({
          ...body,
          profile_badges: [...body.profile_badges, { ...custom, image_url: '/badges/unknown.svg' }],
        })
      ).statusCode,
    ).toBe(422)
    expect(
      (
        await save({
          ...body,
          profile_badges: [
            ...body.profile_badges,
            { ...custom, trigger: { metric: 'reputation', threshold: 0 } },
          ],
        })
      ).statusCode,
    ).toBe(422)
    await runBadgeSweep(database, () => false, now)
    expect((await save({ ...body, profile_badges: [] })).statusCode).toBe(422)
    expect(
      (await database.db.select().from(settings).where(eq(settings.id, 1)))[0]?.profile_badges,
    ).toEqual(DEFAULT_PROFILE_BADGES)
  })
  it('processes more than one batch of users and supports an empty stored catalog', async () => {
    const users = Array.from({ length: 501 }, (_, i) => ({
      user_id: `99999999-0000-4000-8000-${String(i).padStart(12, '0')}`,
      public_number: i + 100,
      created_at: new Date('2020-01-01'),
    }))
    await database.db.insert(users_copy).values(users)
    await database.db
      .insert(profiles)
      .values(users.map(({ user_id }) => ({ user_id, display_name: 'Member' })))
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toHaveLength(502)
    await database.db.delete(profile_badge_awards)
    expect((await save({ ...await admin(), profile_badges: [] })).statusCode).toBe(200)
    await runBadgeSweep(database, () => false, now)
    expect(await awards()).toEqual([])
    expect((await save({ ...(await admin()), name: 'Empty catalog' })).statusCode).toBe(200)
  })
})
