import { sql } from 'drizzle-orm'
import { insertInBatches } from '@blog/db-kit'
import type { SeedContext } from '@blog/db-kit'
import type { Logger } from '@blog/logger'
import { buildDataset } from '@blog/seed-data'
import type { Dataset, SeedProfileName } from '@blog/seed-data'
import type { SeedEnv } from '../config/env.ts'
import { articles, follows, profiles, promotions, reports, settings, slugs, topics, users_copy } from '../infra/db/schema.ts'

export type ContentSeedInput = SeedContext & { profile: SeedProfileName; env: SeedEnv; logger: Logger }

/** Адреса, которые уже занимают не-seed строки реестра. */
async function foreignSlugs(input: ContentSeedInput, dataset: Dataset): Promise<Set<string>> {
  const seed_owners = new Set([
    ...dataset.users.map((user) => user.id),
    ...dataset.topics.map((topic) => topic.id),
    ...dataset.articles.map((article) => article.id),
  ])
  const { rows } = await input.handle.pool.query<{ slug: string; owner_id: string }>('select slug, owner_id from slugs')
  return new Set(rows.filter((row) => !seed_owners.has(row.owner_id)).map((row) => row.slug))
}

/**
 * Пишет в базу content: копии участников, профили, реестр адресов, темы, статьи со счётчиками,
 * подписки, продвижения, жалобы и настройки. Счётчики и репутация берутся из `derive` тех же записей,
 * поэтому совпадают с пересчётом владельцем (discussion). События не публикуются.
 */
export async function seedContent(input: ContentSeedInput): Promise<void> {
  const { db, logger } = input
  const dataset = buildDataset(input.profile, input.anchor, { media_base_url: input.env.S3_PUBLIC_URL, superadmin_email: 'superadmin@blog.test' })
  const taken = await foreignSlugs(input, dataset)
  const warn = (what: string, slug: string): void => logger.warn({ what, slug }, 'seed: запись пропущена — адрес занят не-seed строкой')

  const kept_topics = dataset.topics.filter((topic) => {
    if (!taken.has(topic.slug)) return true
    warn('topic', topic.slug)
    return false
  })
  const topic_ids = new Set(kept_topics.map((topic) => topic.id))
  const kept_articles = dataset.articles.filter((article) => {
    if (article.status !== 'deleted' && taken.has(article.slug)) {
      warn('article', article.slug)
      return false
    }
    return topic_ids.has(article.topic_id)
  })
  const article_ids = new Set(kept_articles.map((article) => article.id))
  const kept_profiles = dataset.profiles.map((profile) => {
    if (profile.slug && taken.has(profile.slug)) {
      warn('profile', profile.slug)
      return { ...profile, slug: null }
    }
    return profile
  })

  await insertInBatches(
    db,
    topics,
    kept_topics.map((topic) => ({
      id: topic.id,
      title: topic.title,
      description: topic.description,
      avatar_url: topic.avatar_url,
      cover_url: topic.cover_url,
      slug: topic.slug,
      status: topic.status,
      position: topic.position,
    })),
    { label: 'topics', logger },
  )
  await insertInBatches(
    db,
    users_copy,
    dataset.users.map((user) => ({
      user_id: user.id,
      public_number: user.public_number,
      role: user.role,
      can_publish: user.can_publish,
      is_restricted: user.restricted_at !== null,
      created_at: user.created_at,
    })),
    { label: 'users_copy', logger },
  )
  await insertInBatches(
    db,
    profiles,
    kept_profiles.map((profile) => ({
      user_id: profile.user_id,
      display_name: profile.display_name,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      cover_url: profile.cover_url,
      slug: profile.slug,
      reputation: dataset.derived.reputation.get(profile.user_id) ?? 0,
    })),
    { label: 'profiles', logger },
  )
  await insertInBatches(
    db,
    slugs,
    [
      ...kept_profiles.flatMap((profile) => (profile.slug ? [{ slug: profile.slug, owner_type: 'profile' as const, owner_id: profile.user_id }] : [])),
      ...kept_topics.map((topic) => ({ slug: topic.slug, owner_type: 'topic' as const, owner_id: topic.id })),
      ...kept_articles.filter((article) => article.status !== 'deleted').map((article) => ({ slug: article.slug, owner_type: 'article' as const, owner_id: article.id })),
    ],
    { label: 'slugs', logger },
  )
  await insertInBatches(
    db,
    articles,
    kept_articles.map((article) => {
      const derived = dataset.derived.articles.get(article.id)
      return {
        id: article.id,
        author_id: article.author_id,
        topic_id: article.topic_id,
        title: article.title,
        slug: article.slug,
        blocks: article.blocks,
        visibility: article.visibility,
        comments_enabled: article.comments_enabled,
        status: article.status,
        published_at: article.published_at,
        reaction_count: derived?.reaction_count ?? 0,
        reaction_counts: derived?.reaction_counts ?? {},
        comment_count: derived?.comment_count ?? 0,
        view_count: derived?.view_count ?? 0,
        bookmark_count: derived?.bookmark_count ?? 0,
        top_comment: derived?.top_comment ?? null,
        excerpt: article.excerpt,
        first_image_url: article.first_image_url,
        search_vector: sql`to_tsvector('simple', ${article.search_text})`,
        created_at: article.created_at,
        updated_at: article.updated_at,
      }
    }),
    { label: 'articles', logger },
  )
  await insertInBatches(db, follows, dataset.follows, { label: 'follows', logger })
  await insertInBatches(db, promotions, dataset.promotions.filter((item) => article_ids.has(item.article_id)), { label: 'promotions', logger })
  await insertInBatches(db, reports, dataset.reports.filter((item) => article_ids.has(item.article_id)), { label: 'reports', logger })
  await insertInBatches(db, settings, [{ id: 1, ...dataset.settings }], { label: 'settings', logger })
}
