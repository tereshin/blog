import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { buildDataset } from '@blog/seed-data'
import type { SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { articles_copy, bookmarks, comments, feed_seen, reactions, users_copy, views } from '../infra/db/schema.ts'

export type DiscussionSeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/**
 * Пишет в базу discussion: копии статей и участников, комментарии, реакции, просмотры,
 * просмотренное в ленте и закладки. Идентификаторы общие с content (из `@blog/seed-data`), счётчики комментариев
 * и реакций считаются из тех же записей. События не публикуются.
 */
export async function seedDiscussion(input: DiscussionSeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, { media_base_url: input.env.S3_PUBLIC_URL, superadmin_email: 'superadmin@blog.test' })
  const profile_of = new Map(dataset.profiles.map((profile) => [profile.user_id, profile]))

  await insertInBatches(
    db,
    articles_copy,
    dataset.articles.map((article) => ({
      article_id: article.id,
      author_id: article.author_id,
      title: article.title,
      slug: article.slug,
      visibility: article.visibility,
      status: article.status,
      comments_enabled: article.comments_enabled,
      published_at: article.published_at,
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
      is_restricted: user.restricted_at !== null,
    })),
    { label: 'users_copy', logger },
  )
  await insertInBatches(
    db,
    comments,
    dataset.comments.map((comment) => ({
      id: comment.id,
      article_id: comment.article_id,
      author_id: comment.author_id,
      parent_id: comment.parent_id,
      body: comment.body,
      status: comment.status,
      edited_at: comment.edited_at,
      reaction_count: dataset.derived.comments.get(comment.id)?.reaction_count ?? 0,
      reply_count: dataset.derived.comments.get(comment.id)?.reply_count ?? 0,
      created_at: comment.created_at,
    })),
    { label: 'comments', logger },
  )
  await insertInBatches(db, reactions, dataset.reactions, { label: 'reactions', logger })
  await insertInBatches(db, views, dataset.views, { label: 'views', logger })
  await insertInBatches(
    db,
    feed_seen,
    dataset.feed_seen.map((item) => ({ viewer_key: item.viewer_key, feed_key: item.feed_key, article_id: item.article_id, seen_at: item.seen_at })),
    { label: 'feed_seen', logger },
  )
  await insertInBatches(db, bookmarks, dataset.bookmarks, { label: 'bookmarks', logger })
}
