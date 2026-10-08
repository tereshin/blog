import { randomUUID } from 'node:crypto'
import { asc, eq, max } from 'drizzle-orm'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Database } from '@blog/broker'
import { ValidationError } from '@blog/errors'
import { topics } from '../../infra/db/schema.ts'
import { replaceSlug, reserveSlug } from '../slug/index.ts'

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

export type TopicWrite = {
  title: string
  description: string | null
  avatar_url: string | null
  cover_url: string | null
  slug: string
}

export type TopicPatch = Partial<TopicWrite> & { status?: 'active' | 'archived' }

export type TopicRepository = {
  listActive: () => Promise<TopicRow[]>
  listAll: () => Promise<TopicRow[]>
  findBySlug: (slug: string) => Promise<TopicRow | null>
  findById: (id: string) => Promise<TopicRow | null>
  create: (input: TopicWrite) => Promise<TopicRow>
  update: (id: string, patch: TopicPatch) => Promise<TopicRow | null>
  reorder: (topic_ids: readonly string[]) => Promise<TopicRow[]>
}

export function createTopicRepository(db: NodePgDatabase): TopicRepository {
  return {
    listActive: () => db.select(topic_columns).from(topics).where(eq(topics.status, 'active')).orderBy(asc(topics.position), asc(topics.title)),
    listAll: () => db.select(topic_columns).from(topics).orderBy(asc(topics.position), asc(topics.title)),
    async findBySlug(slug) {
      const [row] = await db.select(topic_columns).from(topics).where(eq(topics.slug, slug)).limit(1)
      return row ?? null
    },
    async findById(id) {
      const [row] = await db.select(topic_columns).from(topics).where(eq(topics.id, id)).limit(1)
      return row ?? null
    },

    async create(input) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        const id = randomUUID()
        const [max_row] = await database.select({ value: max(topics.position) }).from(topics)
        const position = max_row?.value === null || max_row?.value === undefined ? 0 : Number(max_row.value) + 1
        await reserveSlug(database, input.slug, 'topic', id)
        const [row] = await database.insert(topics).values({ id, ...input, position }).returning(topic_columns)
        if (!row) throw new Error('topic row was not written')
        return row
      })
    },

    async update(id, patch) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        const [current] = await database.select(topic_columns).from(topics).where(eq(topics.id, id)).limit(1)
        if (!current) return null
        if (patch.slug !== undefined && patch.slug !== current.slug) await replaceSlug(database, patch.slug, 'topic', id)
        const [row] = await database.update(topics).set(patch).where(eq(topics.id, id)).returning(topic_columns)
        return row ?? null
      })
    },

    async reorder(topic_ids) {
      return (db as Database).transaction(async (tx) => {
        const database = tx as Database
        const rows = await database.select({ id: topics.id }).from(topics)
        const current = new Set(rows.map((row) => row.id))
        const same = topic_ids.length === current.size && topic_ids.every((id) => current.has(id))
        if (!same) throw new ValidationError({ message: 'Список должен содержать все темы по одному разу', details: { field: 'topic_ids' } })
        for (const [index, id] of topic_ids.entries()) {
          await database.update(topics).set({ position: index }).where(eq(topics.id, id))
        }
        return database.select(topic_columns).from(topics).orderBy(asc(topics.position), asc(topics.title))
      })
    },
  }
}
