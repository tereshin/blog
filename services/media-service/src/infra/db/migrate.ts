import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { runMigrations } from '@blog/db-kit'
import type { DbPool, MigrationLogger } from '@blog/db-kit'

export function migrationsDir(base: string = import.meta.dirname): string {
  const bundled = join(base, 'migrations')
  return existsSync(bundled) ? bundled : join(base, 'infra/db/migrations')
}

export function migrate(pool: DbPool, logger?: MigrationLogger): Promise<string[]> {
  return runMigrations({ pool, dir: migrationsDir(), ...(logger ? { logger } : {}) })
}
