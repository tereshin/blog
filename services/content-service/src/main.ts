import { OutboxRelay, connectBroker } from '@blog/broker'
import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startTelemetry } from '@blog/telemetry'
import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { startCopiesConsumers } from './modules/copies/index.ts'

const SERVICE = 'content-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)

  const database = openDatabase(env.DATABASE_URL)
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE })
  const relay = new OutboxRelay({ db: database.db, broker, logger })

  const app = await buildApp({ env, logger, metrics, database, is_broker_ready: broker.isReady })
  relay.start()
  const copies = await startCopiesConsumers({ db: database.db, broker, logger })

  registerShutdown({
    app,
    logger,
    stoppers: [
      () => copies.stop(),
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
  // Падение на старте (в том числе неполный env) — понятная строка и код ≠ 0; оркестратор перезапустит.
  process.stderr.write(`${SERVICE}: не удалось запустить: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
