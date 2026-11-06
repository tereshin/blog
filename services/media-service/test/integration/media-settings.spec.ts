import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GenericContainer, Wait } from 'testcontainers'
import type { StartedTestContainer } from 'testcontainers'
import { CreateBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import type { ServiceContext } from '@blog/contracts'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { MediaRepository, MediaService, MediaStorage } from '../../src/modules/media/index.ts'
import {
  MediaSettingsRepository,
  MediaSettingsService,
  SettingsCipher,
} from '../../src/modules/media-settings/index.ts'
import type { StorageConfig } from '../../src/modules/media-settings/media-settings.types.ts'

const ADMIN: ServiceContext = {
  user_id: randomUUID(),
  role: 'superadmin',
  is_restricted: false,
  can_publish: true,
  viewer_key: 'test',
}
const compression = { enabled: true, format: 'webp' as const, quality: 82, max_dimension: 256 }

describe('media settings with PostgreSQL and S3-compatible storage', () => {
  let postgres: TestPostgres, database: DbHandle, silo: StartedTestContainer, client: S3Client
  let defaults: MediaStorage,
    runtime: MediaSettingsService,
    media: MediaService,
    config: StorageConfig
  const createRuntime = () =>
    new MediaSettingsService(
      new MediaSettingsRepository(database.db),
      {
        config: { ...config, bucket: 'original', public_url: 'https://old.example.com' },
        store: defaults,
      },
      new SettingsCipher('integration-test-encryption-key'),
      (options) => new MediaStorage(options),
      new MediaRepository(database.db),
    )

  beforeAll(async () => {
    const results = await Promise.all([
      startPostgres(),
      new GenericContainer('pgsty/silo:RELEASE.2026-09-16T00-00-00Z')
        .withEnvironment({
          MINIO_ROOT_USER: 'integration-access',
          MINIO_ROOT_PASSWORD: 'integration-secret',
        })
        .withCommand(['server', '/data'])
        .withExposedPorts(9000)
        .withWaitStrategy(Wait.forHttp('/minio/health/ready', 9000))
        .start(),
    ])
    postgres = results[0]
    silo = results[1]
    database = openDatabase(postgres.url)
    await migrate(database.pool)
    config = {
      endpoint: `http://${silo.getHost()}:${silo.getMappedPort(9000)}`,
      region: 'auto',
      bucket: 'custom',
      public_url: 'https://media.example.com',
      force_path_style: true,
      access_key: 'integration-access',
      secret_key: 'integration-secret',
    }
    client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: true,
      credentials: { accessKeyId: config.access_key, secretAccessKey: config.secret_key },
    })
    await client.send(new CreateBucketCommand({ Bucket: 'original' }))
    await client.send(new CreateBucketCommand({ Bucket: 'custom' }))
    defaults = new MediaStorage({ ...config, bucket: 'original' })
    runtime = createRuntime()
    media = new MediaService(
      new MediaRepository(database.db),
      defaults,
      'https://old.example.com',
      runtime,
    )
  }, 120_000)

  afterAll(async () => {
    runtime?.close()
    defaults?.close()
    client?.destroy()
    await database?.close()
    await postgres?.stop()
    await silo?.stop()
  })

  it('checks draft write/read/delete without changing settings or leaving an object', async () => {
    expect(await runtime.test(ADMIN, { compression, storage: config })).toEqual({ ok: true })
    expect((await runtime.get(ADMIN)).use_custom_storage).toBe(false)
    const listed = await client.send(
      new ListObjectsV2Command({ Bucket: 'custom', Prefix: 'connection-tests/' }),
    )
    expect(listed.KeyCount).toBe(0)
  })

  it('persists encrypted credentials and compression, then uploads optimized images after a restart', async () => {
    await runtime.update(ADMIN, { compression, storage: config })
    const rows = await database.pool.query<{ encrypted_config: string }>(
      'select encrypted_config from media_storage_configs',
    )
    expect(rows.rows[0]?.encrypted_config).not.toContain(config.secret_key)
    runtime.close()
    runtime = createRuntime()
    media = new MediaService(
      new MediaRepository(database.db),
      defaults,
      'https://old.example.com',
      runtime,
    )
    const bytes = await sharp({
      create: { width: 800, height: 400, channels: 4, background: '#0485f7' },
    })
      .png()
      .toBuffer()
    const upload = () =>
      media.upload({
        viewer: ADMIN,
        kind: 'image',
        idempotency_key: 'compressed',
        content_length: bytes.length,
        body: Readable.from([bytes]),
      })
    const file = await upload()
    expect(file).toMatchObject({ mime: 'image/webp', kind: 'image' })
    expect(file.url).toMatch(/^https:\/\/media.example.com\/uploads\//)
    const stored = await (
      await runtime.current()
    ).store.get?.({ key: `uploads/${file.id}`, max_bytes: 1024 * 1024 })
    expect(stored?.byteLength).toBe(file.byte_size)
    if (!stored) throw new Error('Missing uploaded image')
    expect(await sharp(stored).metadata()).toMatchObject({
      width: 256,
      height: 128,
      format: 'webp',
    })
    await runtime.update(ADMIN, { compression, storage: null })
    expect((await upload()).url).toBe(file.url)
    expect(await media.lookup(file.url)).toMatchObject({
      public_url: config.public_url,
      uploader_id: ADMIN.user_id,
    })
  })

  it('keeps favicon readable from its original bucket after changing active storage', async () => {
    await runtime.update(ADMIN, { compression, storage: config })
    const bytes = await sharp({
      create: { width: 96, height: 96, channels: 4, background: '#0485f7' },
    })
      .png()
      .toBuffer()
    const file = await media.upload({
      viewer: ADMIN,
      kind: 'favicon',
      variant: 'png',
      idempotency_key: 'favicon',
      content_length: bytes.length,
      body: Readable.from([bytes]),
    })
    expect(file.mime).toBe('image/png')
    await runtime.update(ADMIN, { compression, storage: null })
    const response = await media.content(file.url)
    const chunks: Buffer[] = []
    for await (const chunk of response.body) chunks.push(Buffer.from(chunk))
    expect(Buffer.concat(chunks)).toEqual(bytes)
    expect(response.mime).toBe('image/png')
  })
})
