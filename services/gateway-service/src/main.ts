import { connectBroker } from '@blog/broker'
import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startTelemetry } from '@blog/telemetry'
import { buildApp, composeServices } from './app.ts'
import { loadEnv } from './config/env.ts'
import { NatsEventSource } from './infra/broker/nats-event-source.ts'
import { subscribeSessionRevocations } from './modules/session/index.ts'

const SERVICE = 'gateway-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)

  // Gateway сам потоков JetStream не создаёт: подписки core NATS получают всё, что публикуют сервисы.
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE, ensure_streams: false })

  const services = composeServices({ env, logger })
  const { events, sessions } = services
  const app = await buildApp({ env, logger, metrics, is_broker_ready: broker.isReady }, services)

  const event_source = new NatsEventSource(broker.nc)
  const stream = events.start(event_source)
  const revocations = subscribeSessionRevocations(event_source, sessions, logger, (event) => {
    events.closeUserConnections(event.user_id)
  })

  registerShutdown({
    app,
    logger,
    stoppers: [
      async () => {
        stream.stop()
        revocations.stop()
        for (const connection of events.registry.all()) connection.close()
      },
      () => services.proxy.close(),
      () => services.identity.close(),
      () => services.content.close(),
      () => broker.close(),
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
