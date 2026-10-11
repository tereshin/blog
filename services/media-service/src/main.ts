import { OutboxRelay, connectBroker, sampleQueueDepth, setConsumerMetrics } from '@blog/broker'
import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startQueueMetrics, startTelemetry } from '@blog/telemetry'
import { createCoverRenderer, createCoverJobsRepository, createCoverWorker, startCoverRequestedConsumer } from './modules/social-cover/index.ts'
import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createS3Store } from './modules/media/index.ts'

const SERVICE = 'media-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)
  const database = openDatabase(env.DATABASE_URL)
  const store = createS3Store({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    access_key: env.S3_ACCESS_KEY,
    secret_key: env.S3_SECRET_KEY,
  })
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE })
  setConsumerMetrics(metrics)
  const queues = startQueueMetrics(metrics, sampleQueueDepth)
  const renderer = createCoverRenderer()
  const repository = createCoverJobsRepository(database.db)
  const relay = new OutboxRelay({ db: database.db, broker, logger })
  const worker = createCoverWorker({ repository, renderer, store, public_url: env.S3_PUBLIC_URL, logger, metrics })
  const consumer = await startCoverRequestedConsumer({ db: database.db, broker, logger, repository })
  relay.start()
  worker.start()
  const app = await buildApp({ env, logger, metrics, database, store, renderer, is_broker_ready: broker.isReady })

  registerShutdown({
    app,
    logger,
    stoppers: [() => queues.stop(), () => consumer.stop(), () => worker.stop(), () => renderer.close(), () => relay.stop(), () => broker.close(), () => database.close(), () => telemetry.shutdown(), async () => metrics.stop()],
  })

  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' })
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: не удалось запустить: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
