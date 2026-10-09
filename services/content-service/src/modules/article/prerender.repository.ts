import { eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { articles, profiles, settings, topics } from '../../infra/db/schema.ts'

export type PrerenderArticle = {
  title: string
  excerpt: string
  first_image_url: string | null
  blocks: unknown
  status: 'draft' | 'published' | 'hidden' | 'deleted'
  visibility: 'public' | 'members' | 'author'
  author_id: string
}

export type PrerenderTopic = { title: string; description: string | null; cover_url: string | null }
export type PrerenderProfile = { display_name: string; bio: string | null; avatar_url: string | null }
export type PrerenderSite = { name: string; about: string; logo_url: string | null }

export type PrerenderRepository = {
  article: (slug: string) => Promise<PrerenderArticle | null>
  topic: (slug: string) => Promise<PrerenderTopic | null>
  profile: (slug: string) => Promise<PrerenderProfile | null>
  site: () => Promise<PrerenderSite | null>
}

export function createPrerenderRepository(db: NodePgDatabase): PrerenderRepository {
  return {
    async article(slug) {
      const [row] = await db
        .select({
          title: articles.title,
          excerpt: articles.excerpt,
          first_image_url: articles.first_image_url,
          blocks: articles.blocks,
          status: articles.status,
          visibility: articles.visibility,
          author_id: articles.author_id,
        })
        .from(articles)
        .where(eq(articles.slug, slug))
        .limit(1)
      return row ?? null
    },
    async topic(slug) {
      const [row] = await db
        .select({ title: topics.title, description: topics.description, cover_url: topics.cover_url })
        .from(topics)
        .where(eq(topics.slug, slug))
        .limit(1)
      return row ?? null
    },
    async profile(slug) {
      const [row] = await db
        .select({ display_name: profiles.display_name, bio: profiles.bio, avatar_url: profiles.avatar_url })
        .from(profiles)
        .where(eq(profiles.slug, slug))
        .limit(1)
      return row ?? null
    },
    async site() {
      const [row] = await db.select({ name: settings.name, about: settings.about, logo_url: settings.logo_url }).from(settings).limit(1)
      return row ?? null
    },
  }
}
