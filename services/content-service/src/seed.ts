import { assertSeedAllowed, parseSeedArgs, runSeed } from '@blog/db-kit'
import { createLogger } from '@blog/logger'
import { loadSeedAppEnv, loadSeedEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { seedContent } from './seed/seed.ts'

// Одноразовая задача: `node dist/seed.js --profile small|large [--anchor=<ISO>]`.
const SERVICE = 'content-service'

async function main(): Promise<void> {
  // В prod процесс завершается до чтения остального окружения и до открытия соединения.
  assertSeedAllowed(loadSeedAppEnv().APP_ENV)
  const args = parseSeedArgs(process.argv.slice(2))
  const env = loadSeedEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL, { statement_timeout_ms: 0 })
  try {
    await runSeed({
      handle,
      profile: args.profile,
      anchor_flag: args.anchor_flag,
      logger,
      write: (context) => seedContent({ ...context, profile: args.profile, env, logger }),
    })
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: seed не выполнен: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
