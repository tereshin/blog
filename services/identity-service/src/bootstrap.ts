import { randomUUID } from 'node:crypto'
import { createLogger } from '@blog/logger'
import { loadBootstrapEnv } from './config/env.ts'
import { openDatabase } from './infra/db/client.ts'
import { createAuthRepository } from './modules/auth/index.ts'

// Одноразовая задача: `node dist/bootstrap.js`. Создаёт суперадминистратора без способа входа.
const SERVICE = 'identity-service'

async function main(): Promise<void> {
  const env = loadBootstrapEnv()
  const logger = createLogger({ service: SERVICE })
  const handle = openDatabase(env.DATABASE_URL)
  try {
    const repository = createAuthRepository(handle.db)
    const result = await repository.provisionSuperadmin({ email: env.SUPERADMIN_EMAIL, correlation_id: randomUUID() })
    logger.info({ created: result.created, correlation_id: randomUUID() }, 'bootstrap: суперадминистратор')
  } finally {
    await handle.close()
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`${SERVICE}: bootstrap не выполнен: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exit(1)
})
