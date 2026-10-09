import { sql } from 'drizzle-orm'
import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { DEFAULT_SEED_OPTIONS, buildDataset, seedId } from '@blog/seed-data'
import type { SeedProfileName, SeedUser } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { auth_identities, settings_copy, users } from '../infra/db/schema.ts'

export type IdentitySeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/**
 * Участники, которых seed не трогает: чужая строка с той же почтой, тем же firebase uid или публичным номером.
 * Такого участника seed пропускает с предупреждением, а не перезаписывает и не падает.
 */
async function findForeignConflicts(input: IdentitySeedInput, seeded: readonly SeedUser[]): Promise<Set<string>> {
  const { rows } = await input.handle.pool.query<{ id: string; email: string; public_number: number }>(
    'select id, lower(email) as email, public_number from users',
  )
  const { rows: identities } = await input.handle.pool.query<{ user_id: string; firebase_uid: string }>(
    'select user_id, firebase_uid from auth_identities',
  )
  const seed_ids = new Set(seeded.map((user) => user.id))
  const foreign = rows.filter((row) => !seed_ids.has(row.id))
  const emails = new Set(foreign.map((row) => row.email))
  const subs = new Set(identities.filter((row) => !seed_ids.has(row.user_id)).map((row) => row.firebase_uid))
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
 * Пишет в базу identity: `users`, `auth_identities` и `settings_copy`. Сессий и `outbox` не создаёт.
 * При заданном эмуляторе создаёт тех же пользователей в Firebase с `SEED_AUTH_PASSWORD`.
 */
export async function seedIdentity(input: IdentitySeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, {
    ...DEFAULT_SEED_OPTIONS,
    superadmin_email: input.env.SUPERADMIN_EMAIL,
    ...(input.env.S3_PUBLIC_URL ? { media_base_url: input.env.S3_PUBLIC_URL } : {}),
  })
  const skipped = await findForeignConflicts(input, dataset.users)
  const admitted = dataset.users.filter((user) => !skipped.has(user.id))

  await insertInBatches(
    db,
    users,
    admitted.map((user) => ({
      id: user.id,
      public_number: user.public_number,
      email: user.email,
      email_verified: true,
      role: user.role,
      can_publish: user.can_publish,
      restricted_at: user.restricted_at,
      created_at: user.created_at,
    })),
    { label: 'users', logger },
  )
  await insertInBatches(
    db,
    auth_identities,
    admitted.map((user) => ({
      id: seedId('auth-identity', user.key),
      user_id: user.id,
      firebase_uid: user.sub,
      provider_id: 'password',
      created_at: user.created_at,
    })),
    { label: 'auth_identities', logger },
  )
  if (input.env.FIREBASE_AUTH_EMULATOR_HOST && input.env.SEED_AUTH_PASSWORD) {
    await seedEmulatorUsers(input.env.FIREBASE_AUTH_EMULATOR_HOST, input.env.SEED_AUTH_PASSWORD, admitted.map((user) => user.email))
  }
  await insertInBatches(
    db,
    settings_copy,
    [{ id: 1, registration_open: dataset.settings.registration_open, new_members_can_publish: dataset.settings.new_members_can_publish }],
    { label: 'settings_copy', logger },
  )
  // Явные публичные номера не двигают последовательность: следующий новый участник получит номер после последнего.
  await db.execute(sql`select setval(pg_get_serial_sequence('users', 'public_number'), greatest((select coalesce(max(public_number), 1) from users), 1))`)
}

/** Пароль в репозиторий не попадает: его даёт окружение и только эмулятор. */
async function seedEmulatorUsers(host: string, password: string, emails: readonly string[]): Promise<void> {
  for (const email of emails) {
    const response = await fetch(`http://${host}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=seed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: false }),
    })
    if (response.ok) continue
    const payload = (await response.json().catch(() => ({}))) as { error?: { message?: string } }
    if (payload.error?.message?.includes('EMAIL_EXISTS')) continue
    throw new Error(`эмулятор не создал ${email}`)
  }
}
