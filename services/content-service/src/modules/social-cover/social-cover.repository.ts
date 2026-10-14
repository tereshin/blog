import { and, eq, gt, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { SocialCoverGeneratedV1 } from '@blog/contracts'
import { articles, profiles, settings, social_covers } from '../../infra/db/schema.ts'
import { appendSocialCoverRequested } from './social-cover.events.ts'
import type { CoverArticle, CoverArticleSource, CoverRequest, CoverSiteSource, SocialCoverRepositoryPort } from './social-cover.types.ts'

export class SocialCoverRepository implements SocialCoverRepositoryPort<Database> {
  async findSite(tx: Database): Promise<CoverSiteSource | null> {
    const [site] = await tx.select({ name: settings.name, logo_url: settings.logo_url, social_cover: settings.social_cover }).from(settings).where(eq(settings.id, 1)).limit(1)
    return site ?? null
  }

  async findArticle(tx: Database, article_id: string): Promise<CoverArticleSource | null> {
    const [article] = await tx.select({ id: articles.id, title: articles.title, first_image_url: articles.first_image_url, status: articles.status, visibility: articles.visibility, author_name: profiles.display_name })
      .from(articles).leftJoin(profiles, eq(profiles.user_id, articles.author_id)).where(eq(articles.id, article_id)).limit(1)
    return article ?? null
  }

  listCoveredByAuthor(tx: Database, author_id: string, after_id: string | undefined, limit: number): Promise<CoverArticle[]> {
    return tx.select({ id: articles.id, title: articles.title, first_image_url: articles.first_image_url, author_name: profiles.display_name })
      .from(articles).innerJoin(social_covers, eq(social_covers.target_id, sql`${articles.id}::text`)).leftJoin(profiles, eq(profiles.user_id, articles.author_id))
      .where(and(eq(articles.author_id, author_id), eq(articles.status, 'published'), eq(articles.visibility, 'public'), after_id ? gt(articles.id, after_id) : undefined))
      .orderBy(articles.id).limit(limit)
  }

  async saveRequest(tx: Database, target_id: string, revision: string): Promise<boolean> {
    const changed = await tx.insert(social_covers).values({ target_id, revision, images: null })
      .onConflictDoUpdate({ target: social_covers.target_id, set: { revision, images: null, requested_at: new Date() }, setWhere: sql`${social_covers.revision} <> ${revision} or (${social_covers.images} is null and ${social_covers.requested_at} < now() - interval '2 minutes')` })
      .returning({ target_id: social_covers.target_id })
    return changed.length > 0
  }

  appendRequested(tx: Database, request: CoverRequest): Promise<void> {
    return appendSocialCoverRequested(tx, request)
  }

  async remove(tx: Database, target_id: string): Promise<void> {
    await tx.delete(social_covers).where(eq(social_covers.target_id, target_id))
  }

  async applyGenerated(tx: Database, result: SocialCoverGeneratedV1): Promise<void> {
    // The version and guest visibility are checked in the same write; stale jobs cannot revive a hidden cover.
    await tx.update(social_covers).set({ images: result.images }).where(and(
      eq(social_covers.target_id, result.target_id), eq(social_covers.revision, result.revision),
      result.target_id === 'site' ? undefined : sql`exists (select 1 from ${articles} where ${articles.id}::text = ${result.target_id} and ${articles.status} = 'published' and ${articles.visibility} = 'public')`,
    ))
  }
}
