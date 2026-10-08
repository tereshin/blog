import { registerShutdown } from '@blog/http-kit'
import { createLogger } from '@blog/logger'
import { createServiceMetrics, startTelemetry } from '@blog/telemetry'
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
  const app = await buildApp({ env, logger, metrics, database, store })

  registerShutdown({
    app,
    logger,
    stoppers: [() => database.close(), () => telemetry.shutdown(), async () => metrics.stop()],
  })

  await app.listen({ port: env.HTTP_PORT, host: '0.0.0.0' })
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: не удалось запустить: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
