import { OutboxRelay, connectBroker, sampleQueueDepth, setConsumerMetrics } from '@blog/broker'
import { FeedbackMailWorker, startFeedbackConsumer } from './modules/feedback-mail/index.ts'
import { createServiceClient } from '@blog/http-kit'
import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startQueueMetrics, startTelemetry } from '@blog/telemetry'
import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { NotificationConsumer, NotificationRepository, NotificationService } from './modules/notification/index.ts'

const SERVICE = 'notification-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)
  setConsumerMetrics(metrics)
  const queues = startQueueMetrics(metrics, sampleQueueDepth, (error) => logger.debug({ err: error }, 'опрос очередей брокера не удался'))

  const database = openDatabase(env.DATABASE_URL)
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE })
  const relay = new OutboxRelay({ db: database.db, broker, logger })
  const consumer = new NotificationConsumer(new NotificationService(new NotificationRepository(database.db)))

  const app = await buildApp({ env, logger, metrics, database, is_broker_ready: broker.isReady })
  const content_client = createServiceClient({ name: 'content', base_url: env.CONTENT_URL })
  const media_client = createServiceClient({ name: 'media', base_url: env.MEDIA_URL, timeout_ms: 15000 })
  const feedback_worker = new FeedbackMailWorker({ db: database.db, content: content_client, media: media_client, env, logger })
  const feedback_consumer = await startFeedbackConsumer({ db: database.db, broker, logger })
  feedback_worker.start()
  relay.start()
  const consumers = await consumer.start({ db: database.db, broker, logger })

  registerShutdown({
    app,
    logger,
    stoppers: [
      () => feedback_consumer.stop(),
      () => feedback_worker.stop(),
      () => content_client.close(),
      () => media_client.close(),
      () => queues.stop(),
      () => consumers.stop(),
      () => relay.stop(),
      () => broker.close(),
      () => database.close(),
      () => telemetry.shutdown(),
      async () => metrics.stop(),
    ],
  })

  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' })
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: не удалось запустить: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
