import { createHash } from 'node:crypto'
import { and, eq, gt, sql } from 'drizzle-orm'
import { appendToOutbox, newEventId } from '@blog/broker'
import type { Database } from '@blog/broker'
import { SocialCoverRequestedV1, socialCoverSettingsSchema } from '@blog/contracts'
import type { SocialCoverInput } from '@blog/contracts'
import { articles, profiles, settings, social_covers } from '../../infra/db/schema.ts'

/** Version the complete rendering input, never the article slug or a wall clock. */
export function coverRevision(input: SocialCoverInput): string {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex')
}

async function requestCover(tx: Database, target_id: string, input: SocialCoverInput, correlation_id: string): Promise<void> {
  const revision = coverRevision(input)
  const changed = await tx.insert(social_covers).values({ target_id, revision, images: null })
    .onConflictDoUpdate({ target: social_covers.target_id, set: { revision, images: null, requested_at: new Date() }, setWhere: sql`${social_covers.revision} <> ${revision} or (${social_covers.images} is null and ${social_covers.requested_at} < now() - interval '2 minutes')` })
    .returning({ target_id: social_covers.target_id })
  if (changed.length === 0) return
  await appendToOutbox(tx, SocialCoverRequestedV1.parse({
    event_id: newEventId(), name: 'content.social_cover.requested', version: 1,
    occurred_at: new Date().toISOString(), correlation_id, causation_id: null,
    target_id, revision, input,
  }))
}

async function siteInput(tx: Database): Promise<SocialCoverInput> {
  const [site] = await tx.select({ name: settings.name, logo_url: settings.logo_url, social_cover: settings.social_cover }).from(settings).where(eq(settings.id, 1)).limit(1)
  const cover_settings = socialCoverSettingsSchema.parse(site?.social_cover ?? {})
  return {
    title: site?.name || 'Блог', site_name: site?.name || 'Блог', author_name: null, image_url: null,
    settings: { ...cover_settings, logo_url: cover_settings.logo_url ?? site?.logo_url ?? null },
  }
}

export async function requestSiteCover(tx: Database, correlation_id: string): Promise<void> {
  await requestCover(tx, 'site', await siteInput(tx), correlation_id)
}

export async function invalidateArticleCover(tx: Database, article_id: string): Promise<void> {
  await tx.delete(social_covers).where(eq(social_covers.target_id, article_id))
}

export async function requestArticleCover(tx: Database, article_id: string, correlation_id: string): Promise<void> {
  const [article] = await tx.select({ id: articles.id, title: articles.title, first_image_url: articles.first_image_url, status: articles.status, visibility: articles.visibility, author_name: profiles.display_name })
    .from(articles).leftJoin(profiles, eq(profiles.user_id, articles.author_id)).where(eq(articles.id, article_id)).limit(1)
  if (!article || article.status !== 'published' || article.visibility !== 'public') {
    await invalidateArticleCover(tx, article_id)
    return
  }
  const site = await siteInput(tx)
  await requestCover(tx, article.id, { ...site, title: article.title, author_name: article.author_name ?? 'Автор', image_url: article.first_image_url }, correlation_id)
}

/** Only previously requested covers participate: no historical article backfill. */
export async function requestAuthorCovers(tx: Database, author_id: string, correlation_id: string): Promise<void> {
  const site = await siteInput(tx)
  let cursor: string | undefined
  for (;;) {
    const batch = await tx.select({ id: articles.id, title: articles.title, first_image_url: articles.first_image_url, author_name: profiles.display_name })
      .from(articles).innerJoin(social_covers, eq(social_covers.target_id, sql`${articles.id}::text`)).leftJoin(profiles, eq(profiles.user_id, articles.author_id))
      .where(and(eq(articles.author_id, author_id), eq(articles.status, 'published'), eq(articles.visibility, 'public'), cursor ? gt(articles.id, cursor) : undefined))
      .orderBy(articles.id).limit(100)
    if (batch.length === 0) return
    for (const article of batch) await requestCover(tx, article.id, { ...site, title: article.title, author_name: article.author_name ?? 'Автор', image_url: article.first_image_url }, correlation_id)
    cursor = batch.at(-1)?.id
  }
}
