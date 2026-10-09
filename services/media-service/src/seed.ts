import { assertSeedAllowed, parseSeedArgs, runSeed } from '@blog/db-kit'
import { createLogger } from '@blog/logger'
import { loadSeedEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createS3SeedStore } from './seed/object-store.ts'
import { seedMedia } from './seed/seed.ts'

// Одноразовая задача: `node dist/seed.js --profile small|large [--anchor=<ISO>]`.
const SERVICE = 'media-service'

async function main(): Promise<void> {
  assertSeedAllowed(process.env.APP_ENV)
  const args = parseSeedArgs(process.argv.slice(2))
  const env = loadSeedEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL)
  const store = createS3SeedStore({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    access_key: env.S3_ACCESS_KEY,
    secret_key: env.S3_SECRET_KEY,
  })
  try {
    await runSeed({
      handle,
      profile: args.profile,
      anchor_flag: args.anchor_flag,
      logger,
      write: (context) => seedMedia({ ...context, profile: args.profile, env, logger, store }),
    })
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: seed не выполнен: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
