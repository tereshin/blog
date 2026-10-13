import { generateKeyPairSync, sign } from 'node:crypto'
import { cp, mkdtemp, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  adminSettingsSchema,
  contextToClaims,
  DEFAULT_SEO_SETTINGS,
  publicSettingsSchema,
} from '@blog/contracts'
import { runMigrations } from '@blog/db-kit'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { createLogger } from '@blog/logger'
import { createServiceMetrics } from '@blog/telemetry'
import type { ServiceMetrics } from '@blog/telemetry'
import { buildApp } from '../../src/app.ts'
import { loadEnv } from '../../src/config/env.ts'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'

const USER = '22222222-2222-4222-8222-222222222222'
const keys = generateKeyPairSync('ed25519')
function headers() {
  const encoded = [
    { alg: 'EdDSA' },
    contextToClaims(
      {
        user_id: USER,
        role: 'superadmin',
        is_restricted: false,
        can_publish: true,
        viewer_key: `user:${USER}`,
      },
      Math.floor(Date.now() / 1000),
    ),
  ]
    .map((part) => Buffer.from(JSON.stringify(part)).toString('base64url'))
    .join('.')
  return {
    'x-service-context': `${encoded}.${sign(null, Buffer.from(encoded), keys.privateKey).toString('base64url')}`,
  }
}

describe('admin media configuration and removal of legacy about', () => {
  let postgres: TestPostgres
  let database: DbHandle
  let app: FastifyInstance
  let metrics: ServiceMetrics
  beforeAll(async () => {
    postgres = await startPostgres()
    database = openDatabase(postgres.url)
    const legacy_dir = await mkdtemp(join(tmpdir(), 'blog-legacy-migrations-'))
    try {
      const source = resolve('src/infra/db/migrations')
      for (const name of await readdir(source)) {
        if (name.endsWith('.sql') && name !== '20261013_remove_about.sql')
          await cp(join(source, name), join(legacy_dir, name))
      }
      await runMigrations({ pool: database.pool, dir: legacy_dir })
      const seo = {
        ...DEFAULT_SEO_SETTINGS,
        description: 'Site description',
        pages: {
          ...DEFAULT_SEO_SETTINGS.pages,
          about: { title: 'Legacy', description: 'Old text' },
        },
      }
      await database.pool.query(
        'insert into settings(id, name, about, seo) values(1, $1, $2, $3)',
        ['Site', 'Legacy text', JSON.stringify(seo)],
      )
      await migrate(database.pool)
    } finally {
      await rm(legacy_dir, { recursive: true, force: true })
    }
    metrics = createServiceMetrics('admin_unification_test')
    app = await buildApp({
      env: loadEnv({
        APP_ENV: 'prod',
        DATABASE_URL: postgres.url,
        NATS_URL: 'nats://unused',
        PUBLIC_ORIGIN: 'https://blog.test',
        MEDIA_URL: 'http://media:3006',
        S3_PUBLIC_URL: 'http://localhost:9000/media',
        SERVICE_JWT_PUBLIC_KEY: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(),
      }),
      database,
      metrics,
      logger: createLogger({ service: 'admin-test', level: 'silent' }),
      is_broker_ready: () => true,
    })
  }, 120_000)
  afterAll(async () => {
    await app?.close()
    metrics?.stop()
    await database?.close()
    await postgres?.stop()
  })
  it('accepts public S3 images in create and update, rejects a foreign origin, and clears images', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/topics',
      headers: headers(),
      payload: {
        title: 'Media',
        slug: 'media-test',
        description: '',
        cover_url: 'http://localhost:9000/media/uploads/cover',
        avatar_url: null,
      },
    })
    expect(created.statusCode).toBe(201)
    const id = created.json().id
    for (const field of ['cover_url', 'avatar_url']) {
      const updated = await app.inject({
        method: 'PATCH',
        url: `/v1/topics/${id}`,
        headers: headers(),
        payload: { [field]: 'http://localhost:9000/media/uploads/image' },
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.json()[field]).toBe('http://localhost:9000/media/uploads/image')
      const rejected = await app.inject({
        method: 'PATCH',
        url: `/v1/topics/${id}`,
        headers: headers(),
        payload: { [field]: 'https://foreign.test/image.png' },
      })
      expect(rejected.statusCode).toBe(422)
      expect(rejected.json().errors).toMatchObject({ field, reason: 'media_url' })
      const cleared = await app.inject({
        method: 'PATCH',
        url: `/v1/topics/${id}`,
        headers: headers(),
        payload: { [field]: null },
      })
      expect(cleared.statusCode).toBe(200)
      expect(cleared.json()[field]).toBeNull()
    }
  })
  it('upgrades saved SEO and supports settings reads and writes without about', async () => {
    const response = await app.inject({ url: '/v1/settings/admin', headers: headers() })
    expect(response.statusCode).toBe(200)
    const settings = adminSettingsSchema.parse(response.json())
    expect(settings).not.toHaveProperty('about')
    expect(settings.seo?.pages).not.toHaveProperty('about')
    expect(settings.seo?.description).toBe('Site description')
    const { public_origin: origin, ...payload } = settings
    expect(origin).toBe('https://blog.test')
    expect(
      (await app.inject({ method: 'PUT', url: '/v1/settings', headers: headers(), payload }))
        .statusCode,
    ).toBe(200)
    const public_response = await app.inject({ url: '/v1/settings', headers: headers() })
    expect(publicSettingsSchema.safeParse(public_response.json()).success).toBe(true)
    const columns = await database.pool.query(
      "select column_name from information_schema.columns where table_name='settings' and column_name='about'",
    )
    expect(columns.rows).toHaveLength(0)
    await database.pool.query(
      "delete from settings; insert into settings(id, name) values(1, 'Fresh')",
    )
    const default_seo = (await database.pool.query('select seo from settings')).rows[0].seo
    expect(default_seo).toEqual(DEFAULT_SEO_SETTINGS)
    expect(await migrate(database.pool)).toEqual([])
  })
  it('returns 404 for about and removes it from the static sitemap', async () => {
    const seo = await app.inject('/internal/seo/page?path=/about')
    expect(seo.json().status).toBe(404)
    const sitemap = await app.inject('/internal/seo/sitemap?part=static')
    expect(sitemap.statusCode).toBe(200)
    expect(sitemap.json().body).not.toContain('/about')
  })
})
