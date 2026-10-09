import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { buildDataset } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { articles_copy, notifications, users_copy } from '../infra/db/schema.ts'

export type NotificationSeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/** Пишет копии статей и участников и уведомления всех пяти видов. События не публикует. */
export async function seedNotifications(input: NotificationSeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, {
    media_base_url: input.env.S3_PUBLIC_URL,
    superadmin_email: input.env.SUPERADMIN_EMAIL,
  })
  const profile_of = new Map(dataset.profiles.map((profile) => [profile.user_id, profile]))

  await insertInBatches(
    db,
    articles_copy,
    dataset.articles.map((article) => ({
      article_id: article.id,
      author_id: article.author_id,
      title: article.title,
      slug: article.slug,
    })),
    { label: 'articles_copy', logger },
  )
  await insertInBatches(
    db,
    users_copy,
    dataset.users.map((user) => ({
      user_id: user.id,
      display_name: profile_of.get(user.id)?.display_name ?? user.display_name,
      avatar_url: profile_of.get(user.id)?.avatar_url ?? null,
    })),
    { label: 'users_copy', logger },
  )
  await insertInBatches(
    db,
    notifications,
    dataset.notifications.map((item) => ({
      id: item.id,
      user_id: item.user_id,
      kind: item.kind,
      article_id: item.article_id,
      comment_id: item.comment_id,
      conversation_id: item.conversation_id,
      actor_id: null,
      read_at: item.read_at,
      created_at: item.created_at,
    })),
    { label: 'notifications', logger },
  )
}
