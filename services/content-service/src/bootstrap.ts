import { randomUUID } from 'node:crypto'
import { createLogger } from '@blog/logger'
import { loadBootstrapEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { BadgeRepository, BadgeService } from './modules/badge/index.ts'
import { SettingsRepository, SettingsService } from './modules/settings/index.ts'
import { SocialCoverRepository, SocialCoverService } from './modules/social-cover/index.ts'

const SERVICE = 'content-service'

async function main(): Promise<void> {
  const env = loadBootstrapEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL, { statement_timeout_ms: 0 })
  try {
    const settings = new SettingsService(
      new SettingsRepository(handle.db),
      new BadgeService(new BadgeRepository()),
      new SocialCoverService(new SocialCoverRepository()),
      { media_url: 'http://localhost' },
    )
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
