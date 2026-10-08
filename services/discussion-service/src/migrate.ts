import { createLogger } from '@blog/logger'
import { loadMigrateEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { migrate } from './infra/db/migrate.ts'

// Одноразовая задача Compose: `node dist/migrate.js`. Миграции на старте реплик не запускаются.
const SERVICE = 'discussion-service'

async function main(): Promise<void> {
  const env = loadMigrateEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL)
  try {
    const applied = await migrate(handle.pool, { info: (message) => logger.info(message) })
    logger.info({ applied }, applied.length > 0 ? 'миграции применены' : 'новых миграций нет')
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: миграция не выполнена: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
