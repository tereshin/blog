import { sql } from 'drizzle-orm'
import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { DEFAULT_SEED_OPTIONS, buildDataset } from '@blog/seed-data'
import type { SeedProfileName, SeedUser } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { settings_copy, users } from '../infra/db/schema.ts'

export type IdentitySeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/**
 * Участники, которых seed не трогает: чужая строка с той же почтой, `google_sub` или публичным номером.
 * Такого участника seed пропускает с предупреждением, а не перезаписывает и не падает.
 */
async function findForeignConflicts(input: IdentitySeedInput, seeded: readonly SeedUser[]): Promise<Set<string>> {
  const { rows } = await input.handle.pool.query<{ id: string; email: string; google_sub: string | null; public_number: number }>(
    'select id, lower(email) as email, google_sub, public_number from users',
  )
  const seed_ids = new Set(seeded.map((user) => user.id))
  const foreign = rows.filter((row) => !seed_ids.has(row.id))
  const emails = new Set(foreign.map((row) => row.email))
  const subs = new Set(foreign.flatMap((row) => (row.google_sub ? [row.google_sub] : [])))
  const numbers = new Set(foreign.map((row) => row.public_number))
  const skipped = new Set<string>()
  for (const user of seeded) {
    if (emails.has(user.email.toLowerCase()) || subs.has(user.sub) || numbers.has(user.public_number)) {
      skipped.add(user.id)
      input.logger.warn({ user: user.key, email: user.email }, 'seed: участник пропущен — конфликт с не-seed строкой')
    }
  }
  return skipped
}

/**
 * Пишет в базу identity: `users` и `settings_copy`. Сессий и `outbox` не создаёт, события не публикует:
 * сессию создаёт вход через mock-google, копии в других сервисах кладут их собственные seed.
 */
export async function seedIdentity(input: IdentitySeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, {
    ...DEFAULT_SEED_OPTIONS,
    superadmin_email: input.env.SUPERADMIN_EMAIL,
    ...(input.env.S3_PUBLIC_URL ? { media_base_url: input.env.S3_PUBLIC_URL } : {}),
  })
  const skipped = await findForeignConflicts(input, dataset.users)

  await insertInBatches(
    db,
    users,
    dataset.users
      .filter((user) => !skipped.has(user.id))
      .map((user) => ({
        id: user.id,
        public_number: user.public_number,
        google_sub: user.sub,
        email: user.email,
        role: user.role,
        can_publish: user.can_publish,
        restricted_at: user.restricted_at,
        created_at: user.created_at,
      })),
    { label: 'users', logger },
  )
  await insertInBatches(
    db,
    settings_copy,
    [{ id: 1, registration_open: dataset.settings.registration_open, new_members_can_publish: dataset.settings.new_members_can_publish }],
    { label: 'settings_copy', logger },
  )
  // Явные публичные номера не двигают последовательность: следующий новый участник получит номер после последнего.
  await db.execute(sql`select setval(pg_get_serial_sequence('users', 'public_number'), greatest((select coalesce(max(public_number), 1) from users), 1))`)
}
