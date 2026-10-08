import { connectBroker } from '@blog/broker'
import { createServiceClient, registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startTelemetry } from '@blog/telemetry'
import { buildApp } from './app.ts'
import { loadEnv } from './config/env.ts'
import { createContentAccessChecker, EventsService } from './modules/events/index.ts'
import { ProxyService } from './modules/proxy/index.ts'
import {
  SessionService,
  createContextSigner,
  createIdentityLookup,
  subscribeSessionRevocations,
} from './modules/session/index.ts'

const SERVICE = 'gateway-service'

async function main(): Promise<void> {
  const env = loadEnv()
  const logger = createLogger({ service: SERVICE, level: env.LOG_LEVEL })
  const telemetry = startTelemetry({ service: SERVICE, otlp_endpoint: env.OTEL_EXPORTER_OTLP_ENDPOINT })
  const metrics = createServiceMetrics(SERVICE)

  // Gateway сам потоков JetStream не создаёт: подписки core NATS получают всё, что публикуют сервисы.
  const broker = await connectBroker({ url: env.NATS_URL, name: SERVICE, ensure_streams: false })

  const identity = createServiceClient({ name: 'identity', base_url: env.IDENTITY_URL })
  const content = createServiceClient({ name: 'content', base_url: env.CONTENT_URL })
  const sessions = new SessionService(createIdentityLookup(identity))
  const events = new EventsService(createContentAccessChecker(content), logger)
  const proxy = new ProxyService({
    identity: env.IDENTITY_URL,
    content: env.CONTENT_URL,
    discussion: env.DISCUSSION_URL,
    messaging: env.MESSAGING_URL,
    notification: env.NOTIFICATION_URL,
    media: env.MEDIA_URL,
  })

  const app = await buildApp({
    env,
    logger,
    metrics,
    sessions,
    signer: createContextSigner(env.SERVICE_JWT_PRIVATE_KEY),
    proxy,
    events,
    is_broker_ready: broker.isReady,
  })

  const stream = events.start(broker.nc)
  const revocations = subscribeSessionRevocations(broker.nc, sessions, logger, (event) => {
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
      () => proxy.close(),
      () => identity.close(),
      () => content.close(),
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
