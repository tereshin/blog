import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { GenericContainer, Wait } from 'testcontainers'
import type { StartedTestContainer } from 'testcontainers'
import { S3Client, CreateBucketCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import sharp from 'sharp'
import { OutboxRelay, connectBroker } from '@blog/broker'
import type { BrokerClient, RunningConsumer } from '@blog/broker'
import { startNats } from '@blog/broker/testing'
import type { TestNats } from '@blog/broker/testing'
import { startPostgres } from '@blog/db-kit/testing'
import type { TestPostgres } from '@blog/db-kit/testing'
import { SocialCoverRequestedV1 } from '@blog/contracts'
import { createLogger } from '@blog/logger'
import { createServiceMetrics } from '@blog/telemetry'
import { openDatabase } from '../../src/infra/db/client.ts'
import type { DbHandle } from '../../src/infra/db/client.ts'
import { migrate } from '../../src/infra/db/migrate.ts'
import { createCoverRenderer, createCoverJobsRepository, createCoverWorker, startCoverRequestedConsumer } from '../../src/modules/social-cover/index.ts'
import type { CoverRenderer } from '../../src/modules/social-cover/index.ts'
import { createS3Store } from '../../src/modules/media/index.ts'
import { migrate as migrateContent } from '../../../content-service/src/infra/db/migrate.ts'
import { articles, topics, profiles } from '../../../content-service/src/infra/db/schema.ts'
import { requestArticleCover, startSocialCoverConsumer } from '../../../content-service/src/modules/social-cover/index.ts'
import { createSeoRepository } from '../../../content-service/src/modules/seo/index.ts'

const logger = createLogger({ service: 'social-cover-test', level: 'silent' })
const metrics = createServiceMetrics('social_cover_integration')
const ARTICLE = randomUUID(), AUTHOR = randomUUID(), TOPIC = randomUUID()
async function eventually(check: () => Promise<boolean>, timeout = 20_000) {
  const end = Date.now() + timeout
  while (Date.now() < end) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 50)) }
  throw new Error('Timed out waiting for social cover event')
}
describe('превью: PostgreSQL → NATS → worker → MinIO → NATS → content', () => {
  let media_pg: TestPostgres, content_pg: TestPostgres, nats: TestNats, minio: StartedTestContainer
  let database: DbHandle, content: DbHandle, broker: BrokerClient, renderer: CoverRenderer
  let input_consumer: RunningConsumer, output_consumer: RunningConsumer
  let endpoint: string, public_url: string, client: S3Client
  beforeAll(async () => {
    ;[media_pg, content_pg, nats] = await Promise.all([startPostgres(), startPostgres(), startNats()])
    minio = await new GenericContainer('pgsty/silo:RELEASE.2026-09-16T00-00-00Z').withEnvironment({ MINIO_ROOT_USER: 'testaccess', MINIO_ROOT_PASSWORD: 'testsecret' }).withCommand(['server', '/data']).withExposedPorts(9000).withWaitStrategy(Wait.forHttp('/minio/health/live', 9000)).start()
    endpoint = `http://${minio.getHost()}:${minio.getMappedPort(9000)}`; public_url = `${endpoint}/media`
    client = new S3Client({ endpoint, region: 'us-east-1', forcePathStyle: true, credentials: { accessKeyId: 'testaccess', secretAccessKey: 'testsecret' } })
    await client.send(new CreateBucketCommand({ Bucket: 'media' }))
    database = openDatabase(media_pg.url); content = openDatabase(content_pg.url)
    await Promise.all([migrate(database.pool), migrateContent(content.pool)])
    broker = await connectBroker({ url: nats.url, name: 'social-cover-test' })
    renderer = createCoverRenderer(2)
    input_consumer = await startCoverRequestedConsumer({ db: database.db, broker, logger, repository: createCoverJobsRepository(database.db) })
    output_consumer = await startSocialCoverConsumer({ db: content.db, broker, logger })
    await content.db.insert(topics).values({ id: TOPIC, title: 'Тема', slug: 'topic', position: 0 })
    await content.db.insert(profiles).values({ user_id: AUTHOR, display_name: 'Ђорђе' })
    await content.db.insert(articles).values({ id: ARTICLE, author_id: AUTHOR, topic_id: TOPIC, title: 'Превью с кириллицей и сербским', slug: 'social-post', status: 'published', visibility: 'public', published_at: new Date(), blocks: { time: 1, version: '2.28.0', blocks: [] } })
  }, 120_000)
  afterAll(async () => {
    await input_consumer?.stop(); await output_consumer?.stop(); await renderer?.close(); await broker?.close()
    await database?.close(); await content?.close(); client?.destroy(); metrics.stop()
    await Promise.all([media_pg?.stop(), content_pg?.stop(), nats?.stop(), minio?.stop()])
  }, 120_000)
  it('публикует сразу, доставляет дубли без повторной задачи и возвращает три JPEG', async () => {
    await content.db.transaction(async (tx) => requestArticleCover(tx, ARTICLE, randomUUID()))
    expect(await createSeoRepository(content.db).covers(ARTICLE)).toBeNull()
    const input_relay = new OutboxRelay({ db: content.db, broker, logger })
    expect(await input_relay.flushOnce()).toBe(1)
    await eventually(async () => Number((await database.pool.query("select count(*) as n from social_cover_jobs")).rows[0]?.n) === 1)
    const event = SocialCoverRequestedV1.parse((await content.pool.query('select payload from outbox')).rows[0]?.payload)
    await broker.js.publish(event.name, JSON.stringify(event))
    await broker.nc.flush()
    const store = createS3Store({ endpoint, region: 'us-east-1', bucket: 'media', access_key: 'testaccess', secret_key: 'testsecret' })
    const repository = createCoverJobsRepository(database.db)
    expect(await createCoverWorker({ repository, renderer, store, public_url, logger, metrics }).runOnce()).toBe(true)
    expect(await createCoverWorker({ repository, renderer, store, public_url, logger, metrics }).runOnce()).toBe(false)
    const output_relay = new OutboxRelay({ db: database.db, broker, logger })
    expect(await output_relay.flushOnce()).toBe(1)
    await eventually(async () => !!await createSeoRepository(content.db).covers(ARTICLE))
    const images = await createSeoRepository(content.db).covers(ARTICLE)
    expect(images?.og).toMatchObject({ width: 1200, height: 630 })
    expect(images?.twitter).toMatchObject({ width: 1200, height: 630 })
    expect(images?.vk).toMatchObject({ width: 1074, height: 480 })
    for (const image of Object.values(images ?? {})) {
      const object = await client.send(new GetObjectCommand({ Bucket: 'media', Key: image.url.slice(public_url.length + 1) }))
      expect(object.ContentType).toBe('image/jpeg'); expect(object.CacheControl).toContain('immutable')
      expect(await sharp(await object.Body?.transformToByteArray()).metadata()).toMatchObject({ width: image.width, height: image.height })
    }
    expect(Number((await database.pool.query('select count(*) as n from social_cover_jobs')).rows[0]?.n)).toBe(1)
    expect(Number((await database.pool.query("select count(*) as n from processed_events where consumer='media-social-covers'")).rows[0]?.n)).toBe(1)
  }, 30_000)
  it('после перезапуска возвращает зависшую задачу; ошибка хранилища повторяется и завершается после пяти попыток', async () => {
    await database.pool.query("update social_cover_jobs set status='processing', lease_until=now()-interval '1 second', lease_id=$1", [randomUUID()])
    const repository = createCoverJobsRepository(database.db)
    const job = await repository.claim(); expect(job?.attempts).toBe(2)
    if (!job) throw new Error('Missing leased job')
    await repository.fail(job, 'interrupted')
    const broken_store = { async put() { throw new Error('S3 unavailable') } }
    const worker = createCoverWorker({ repository, renderer, store: broken_store, public_url, logger, metrics })
    for (let index = 0; index < 3; index++) {
      await database.pool.query("update social_cover_jobs set available_at=now()-interval '1 second'")
      expect(await worker.runOnce()).toBe(true)
    }
    expect(await repository.counts()).toEqual({ pending: 0, failed: 1 })
    expect((await database.pool.query('select attempts,last_error from social_cover_jobs')).rows[0]).toMatchObject({ attempts: 5, last_error: 'S3 unavailable' })
    const event = SocialCoverRequestedV1.parse((await content.pool.query('select payload from outbox')).rows[0]?.payload)
    await broker.js.publish(event.name, JSON.stringify({ ...event, event_id: randomUUID() }))
    await eventually(async () => (await repository.counts()).pending === 1)
    const retry = await repository.claim()
    expect(retry?.attempts).toBe(1)
    if (!retry) throw new Error('Missing retried job')
    const images = await createSeoRepository(content.db).covers(ARTICLE)
    if (!images) throw new Error('Missing generated images')
    await repository.complete(job, images)
    expect((await database.pool.query('select status from social_cover_jobs')).rows[0]?.status).toBe('processing')
    await repository.complete(retry, images)
    expect((await database.pool.query('select status from social_cover_jobs')).rows[0]?.status).toBe('ready')

  }, 30_000)
})
