import { randomUUID } from 'node:crypto'
import { createLogger } from '@blog/logger'
import { loadBootstrapEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createSettingsRepository, createSettingsService } from './modules/settings/index.ts'

// Одноразовая задача: `node dist/bootstrap.js`. Строка настроек по умолчанию, если её нет.
const SERVICE = 'content-service'

async function main(): Promise<void> {
  const env = loadBootstrapEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL)
  try {
    const settings = createSettingsService(createSettingsRepository(handle.db), { media_url: 'http://localhost' })
    const row = await settings.ensureDefaults(randomUUID())
    logger.info({ name: row.name, registration_open: row.registration_open }, 'bootstrap: настройки')
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: bootstrap не выполнен: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
