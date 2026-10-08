import { asc, eq } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { topics } from '../../infra/db/schema.ts'

const topic_columns = {
  id: topics.id,
  title: topics.title,
  description: topics.description,
  avatar_url: topics.avatar_url,
  cover_url: topics.cover_url,
  slug: topics.slug,
  status: topics.status,
  position: topics.position,
}

export type TopicRow = {
  id: string
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
  status: 'active' | 'archived'
  position: number
}

export type TopicRepository = {
  listActive: () => Promise<TopicRow[]>
  findBySlug: (slug: string) => Promise<TopicRow | null>
}

export function createTopicRepository(db: NodePgDatabase): TopicRepository {
  return {
    listActive: () => db.select(topic_columns).from(topics).where(eq(topics.status, 'active')).orderBy(asc(topics.position), asc(topics.title)),
    async findBySlug(slug) {
      const [row] = await db.select(topic_columns).from(topics).where(eq(topics.slug, slug)).limit(1)
      return row ?? null
    },
  }
}
