import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { runSeed } from '@blog/db-kit'
import { hashTables, startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { openDatabase as openIdentity } from '../../../../services/identity-service/src/infra/db/client.ts'
import { migrate as migrateIdentity } from '../../../../services/identity-service/src/infra/db/migrate.ts'
import { seedIdentity } from '../../../../services/identity-service/src/seed/seed.ts'
import { openDatabase as openContent } from '../../../../services/content-service/src/infra/db/client.ts'
import { migrate as migrateContent } from '../../../../services/content-service/src/infra/db/migrate.ts'
import { seedContent } from '../../../../services/content-service/src/seed/seed.ts'
import { openDatabase as openDiscussion } from '../../../../services/discussion-service/src/infra/db/client.ts'
import { migrate as migrateDiscussion } from '../../../../services/discussion-service/src/infra/db/migrate.ts'
import { seedDiscussion } from '../../../../services/discussion-service/src/seed/seed.ts'
import { openDatabase as openMessaging } from '../../../../services/messaging-service/src/infra/db/client.ts'
import { migrate as migrateMessaging } from '../../../../services/messaging-service/src/infra/db/migrate.ts'
import { seedMessaging } from '../../../../services/messaging-service/src/seed/seed.ts'
import { openDatabase as openNotification } from '../../../../services/notification-service/src/infra/db/client.ts'
import { migrate as migrateNotification } from '../../../../services/notification-service/src/infra/db/migrate.ts'
import { seedNotifications } from '../../../../services/notification-service/src/seed/seed.ts'
import { openDatabase as openMedia } from '../../../../services/media-service/src/infra/db/client.ts'
import { migrate as migrateMedia } from '../../../../services/media-service/src/infra/db/migrate.ts'
import { seedMedia } from '../../../../services/media-service/src/seed/seed.ts'
import type { SeedObjectStore } from '../../../../services/media-service/src/seed/object-store.ts'

const logger = createLogger({ service: 'seed-idempotency', level: 'silent' })
const ANCHOR = '2026-10-08T00:00:00Z'
const media = 'http://localhost:9000/media'

function databaseUrl(admin: string, name: string): string {
  const url = new URL(admin)
  url.pathname = `/${name}`
  return url.toString()
}

describe('повторный seed не меняет строки', () => {
  let postgres: TestPostgres

  beforeAll(async () => {
    postgres = await startPostgres()
    const admin = openIdentity(postgres.url)
    for (const name of ['identity_seed', 'content_seed', 'discussion_seed', 'messaging_seed', 'notification_seed', 'media_seed']) {
      await admin.pool.query(`create database ${name}`)
    }
    await admin.close()
  }, 120_000)

  afterAll(async () => {
    await postgres.stop()
  })

  it('повтор во всех шести базах не меняет хеш и не трогает чужую строку', async () => {
    const identity = openIdentity(databaseUrl(postgres.url, 'identity_seed'))
    const content = openContent(databaseUrl(postgres.url, 'content_seed'))
    const discussion = openDiscussion(databaseUrl(postgres.url, 'discussion_seed'))
    const messaging = openMessaging(databaseUrl(postgres.url, 'messaging_seed'))
    const notification = openNotification(databaseUrl(postgres.url, 'notification_seed'))
    const media_db = openMedia(databaseUrl(postgres.url, 'media_seed'))
    const objects = new Map<string, Uint8Array>()
    const store: SeedObjectStore = {
      exists: async (key) => objects.has(key),
      put: async (input) => {
        objects.set(input.key, input.body)
      },
    }
    try {
      await migrateIdentity(identity.pool)
      await migrateContent(content.pool)
      await migrateDiscussion(discussion.pool)
      await migrateMessaging(messaging.pool)
      await migrateNotification(notification.pool)
      await migrateMedia(media_db.pool)
      const shared = { APP_ENV: 'local' as const, S3_PUBLIC_URL: media, SUPERADMIN_EMAIL: 'superadmin@blog.test' }
      const identity_env = { ...shared, DATABASE_URL: databaseUrl(postgres.url, 'identity_seed') }
      const content_env = { APP_ENV: 'local' as const, DATABASE_URL: databaseUrl(postgres.url, 'content_seed'), S3_PUBLIC_URL: media }
      const discussion_env = { APP_ENV: 'local' as const, DATABASE_URL: databaseUrl(postgres.url, 'discussion_seed'), S3_PUBLIC_URL: media }
      const messaging_env = { ...shared, DATABASE_URL: databaseUrl(postgres.url, 'messaging_seed') }
      const notification_env = { ...shared, DATABASE_URL: databaseUrl(postgres.url, 'notification_seed') }
      const media_env = {
        ...shared,
        DATABASE_URL: databaseUrl(postgres.url, 'media_seed'),
        S3_ENDPOINT: 'http://localhost:9000',
        S3_BUCKET: 'media',
        S3_ACCESS_KEY: 'key',
        S3_SECRET_KEY: 'secret',
        S3_REGION: 'us-east-1',
      }
      const once = async () => {
        await runSeed({ handle: identity, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedIdentity({ ...context, profile: 'small', env: identity_env, logger }) })
        await runSeed({ handle: content, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedContent({ ...context, profile: 'small', env: content_env, logger }) })
        await runSeed({ handle: discussion, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedDiscussion({ ...context, profile: 'small', env: discussion_env, logger }) })
        await runSeed({ handle: messaging, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedMessaging({ ...context, profile: 'small', env: messaging_env, logger }) })
        await runSeed({ handle: notification, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedNotifications({ ...context, profile: 'small', env: notification_env, logger }) })
        await runSeed({ handle: media_db, profile: 'small', anchor_flag: ANCHOR, logger, write: (context) => seedMedia({ ...context, profile: 'small', env: media_env, logger, store }) })
      }
      await once()
      await identity.pool.query(
        "insert into users (id, email, google_sub) values ('00000000-0000-4000-8000-000000000099', 'foreign@blog.test', 'foreign-sub')",
      )
      const object_count = objects.size
      const hashes = {
        identity: await hashTables(identity.pool, ['users', 'seed_runs']),
        content: await hashTables(content.pool, ['articles', 'users_copy', 'seed_runs']),
        discussion: await hashTables(discussion.pool, ['comments', 'reactions', 'seed_runs']),
        messaging: await hashTables(messaging.pool, ['conversations', 'messages', 'seed_runs']),
        notification: await hashTables(notification.pool, ['notifications', 'seed_runs']),
        media: await hashTables(media_db.pool, ['files', 'seed_runs']),
      }
      await once()
      expect(await hashTables(identity.pool, ['users', 'seed_runs'])).toEqual(hashes.identity)
      expect(await hashTables(content.pool, ['articles', 'users_copy', 'seed_runs'])).toEqual(hashes.content)
      expect(await hashTables(discussion.pool, ['comments', 'reactions', 'seed_runs'])).toEqual(hashes.discussion)
      expect(await hashTables(messaging.pool, ['conversations', 'messages', 'seed_runs'])).toEqual(hashes.messaging)
      expect(await hashTables(notification.pool, ['notifications', 'seed_runs'])).toEqual(hashes.notification)
      expect(await hashTables(media_db.pool, ['files', 'seed_runs'])).toEqual(hashes.media)
      expect(objects.size).toBe(object_count)
      const foreign = await identity.pool.query<{ email: string }>("select email from users where id = '00000000-0000-4000-8000-000000000099'")
      expect(foreign.rows[0]?.email).toBe('foreign@blog.test')
      const users = await identity.pool.query<{ n: string }>('select count(*) as n from users')
      const copies = await content.pool.query<{ n: string }>('select count(*) as n from users_copy')
      expect(Number(copies.rows[0]?.n)).toBe(Number(users.rows[0]?.n) - 1)
    } finally {
      await identity.close()
      await content.close()
      await discussion.close()
      await messaging.close()
      await notification.close()
      await media_db.close()
    }
  }, 180_000)
})
