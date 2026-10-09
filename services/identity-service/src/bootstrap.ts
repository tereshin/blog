import { randomUUID } from 'node:crypto'
import { createLogger } from '@blog/logger'
import { loadBootstrapEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createAuthRepository, createAuthService } from './modules/auth/index.ts'

// Одноразовая задача: `node dist/bootstrap.js`. Создаёт суперадминистратора, если его ещё нет.
const SERVICE = 'identity-service'

const unusedGoogle = {
  begin: async (): Promise<never> => {
    throw new Error('bootstrap не открывает вход')
  },
  exchange: async (): Promise<never> => {
    throw new Error('bootstrap не обменивает код')
  },
}

async function main(): Promise<void> {
  const env = loadBootstrapEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL)
  try {
    const auth = createAuthService({
      repository: createAuthRepository(handle.db),
      google: unusedGoogle,
      redirect_uri: 'http://localhost/v1/auth/google/callback',
      superadmin_email: env.SUPERADMIN_EMAIL,
      session_ttl_days: 30,
    })
    const result = await auth.provisionSuperadmin(env.SUPERADMIN_EMAIL)
    logger.info({ created: result.created, correlation_id: randomUUID() }, 'bootstrap: суперадминистратор')
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: bootstrap не выполнен: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
