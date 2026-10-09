import { OutboxRelay, connectBroker, sampleQueueDepth, setConsumerMetrics } from '@blog/broker'
import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startQueueMetrics, startTelemetry } from '@blog/telemetry'
import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createNotificationRepository, startNotificationConsumers } from './modules/notification/index.ts'

const SERVICE = 'notification-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)
  setConsumerMetrics(metrics)
  const queues = startQueueMetrics(metrics, sampleQueueDepth)

  const database = openDatabase(env.DATABASE_URL)
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE })
  const relay = new OutboxRelay({ db: database.db, broker, logger })
  const repository = createNotificationRepository(database.db)

  const app = await buildApp({ env, logger, metrics, database, is_broker_ready: broker.isReady })
  relay.start()
  const consumers = await startNotificationConsumers({ db: database.db, broker, logger, repository })

  registerShutdown({
    app,
    logger,
    stoppers: [
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
