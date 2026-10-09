import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { buildDataset } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { conversations, messages, users_copy } from '../infra/db/schema.ts'

export type MessagingSeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/**
 * Пишет копии участников, диалоги и сообщения. События не публикует.
 * Сообщение, чей диалог не попал в базу (конфликт пары с чужой строкой), пропускается.
 */
export async function seedMessaging(input: MessagingSeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, {
    media_base_url: input.env.S3_PUBLIC_URL,
    superadmin_email: input.env.SUPERADMIN_EMAIL,
  })
  const profile_of = new Map(dataset.profiles.map((profile) => [profile.user_id, profile]))

  await insertInBatches(
    db,
    users_copy,
    dataset.users.map((user) => {
      const profile = profile_of.get(user.id)
      return {
        user_id: user.id,
        display_name: profile?.display_name ?? user.display_name,
        avatar_url: profile?.avatar_url ?? null,
        slug: profile?.slug ?? null,
        is_restricted: user.restricted_at !== null,
      }
    }),
    { label: 'users_copy', logger },
  )
  await insertInBatches(db, conversations, dataset.conversations, { label: 'conversations', logger })

  const present = new Set(
    (await input.handle.pool.query<{ id: string }>('select id from conversations')).rows.map((row) => row.id),
  )
  const deliverable = dataset.messages.filter((message) => present.has(message.conversation_id))
  if (deliverable.length !== dataset.messages.length) {
    logger.warn({ skipped: dataset.messages.length - deliverable.length }, 'seed: сообщения пропущены — диалога нет')
  }
  await insertInBatches(db, messages, deliverable, { label: 'messages', logger })
}
