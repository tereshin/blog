import { and, desc, eq, sql } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { seoSettingsSchema, socialCoverSettingsSchema, socialImagesSchema } from '@blog/contracts'
import {
  articles,
  profiles,
  settings,
  social_covers,
  topics,
  users_copy,
} from '../../infra/db/schema.ts'
import type { SeoRepositoryPort } from './seo.types.ts'

export class SeoRepository implements SeoRepositoryPort {
  constructor(private readonly db: NodePgDatabase) {}
  simplePage?: SeoRepositoryPort['simplePage']

    async pendingCover(target_id: string) {
      const [row] = await this.db
        .select({ images: social_covers.images, requested_at: social_covers.requested_at })
        .from(social_covers)
        .where(eq(social_covers.target_id, target_id))
        .limit(1)
      return !!row && !row.images && row.requested_at.getTime() > Date.now() - 120_000
    }

    async site() {
      const [row] = await this.db
        .select({
          meta_pixel_id: settings.meta_pixel_id,
          favicon: settings.favicon,
          name: settings.name,
          logo_url: settings.logo_url,
          locale: settings.locale,
          seo: settings.seo,
          social_cover: settings.social_cover,
        })
        .from(settings)
        .where(eq(settings.id, 1))
        .limit(1)
      return {
        meta_pixel_id: row?.meta_pixel_id ?? null,
        favicon: row?.favicon,
        name: row?.name || 'Блог',
        logo_url: row?.logo_url ?? null,
        locale: row?.locale ?? 'ru',
        seo: seoSettingsSchema.parse(row?.seo ?? {}),
        social_cover: socialCoverSettingsSchema.parse(row?.social_cover ?? {}),
      }
    }

    async article(slug: string) {
      const [row] = await this.db
        .select({
          id: articles.id,
          slug: articles.slug,
          title: articles.title,
          seo_title: articles.seo_title,
          seo_description: articles.seo_description,
          excerpt: articles.excerpt,
          first_image_url: articles.first_image_url,
          blocks: articles.blocks,
          status: articles.status,
          visibility: articles.visibility,
          published_at: articles.published_at,
          updated_at: articles.updated_at,
          author_name: profiles.display_name,
          author_slug: profiles.slug,
          author_number: users_copy.public_number,
          topic_title: topics.title,
          topic_slug: topics.slug,
        })
        .from(articles)
        .innerJoin(topics, eq(topics.id, articles.topic_id))
        .leftJoin(profiles, eq(profiles.user_id, articles.author_id))
        .leftJoin(users_copy, eq(users_copy.user_id, articles.author_id))
        .where(and(eq(articles.slug, slug), sql`${articles.status} <> 'deleted'`))
        .limit(1)
      return row ?? null
    }

    async profile(slug: string) {
      const numeric =
        /^[1-9]\d*$/.test(slug) && Number.isSafeInteger(Number(slug)) && Number(slug) <= 2147483647
      const select = () =>
        this.db
          .select({
            display_name: profiles.display_name,
            bio: profiles.bio,
            avatar_url: profiles.avatar_url,
            slug: profiles.slug,
            public_number: users_copy.public_number,
            created_at: users_copy.created_at,
          })
          .from(profiles)
          .innerJoin(users_copy, eq(users_copy.user_id, profiles.user_id))
      const [by_slug] = await select().where(and(eq(profiles.slug, slug), eq(users_copy.is_deleted, false))).limit(1)
      if (by_slug) return by_slug
      if (!numeric) return null
      const [by_number] = await select()
        .where(and(eq(users_copy.public_number, Number(slug)), eq(users_copy.is_deleted, false)))
        .limit(1)
      return by_number ?? null
    }

    async topicArticles(slug: string) {
      return this.db.select({ slug: articles.slug, title: articles.title, excerpt: articles.excerpt })
        .from(articles).innerJoin(topics, eq(topics.id, articles.topic_id))
        .where(and(eq(topics.slug, slug), eq(articles.status, 'published'), eq(articles.visibility, 'public')))
        .orderBy(desc(articles.published_at), desc(articles.id)).limit(20)
    }

    async topic(slug: string) {
      const [row] = await this.db
        .select({
          title: topics.title,
          description: topics.description,
          cover_url: topics.cover_url,
          slug: topics.slug,
        })
        .from(topics)
        .where(eq(topics.slug, slug))
        .limit(1)
      return row ?? null
    }

    async covers(target_id: string) {
      const [row] = await this.db
        .select({ images: social_covers.images })
        .from(social_covers)
        .where(eq(social_covers.target_id, target_id))
        .limit(1)
      return row?.images ? socialImagesSchema.parse(row.images) : null
    }
}
