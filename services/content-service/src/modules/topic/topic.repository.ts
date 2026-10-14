import { asc, eq, max } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { topics } from '../../infra/db/schema.ts'
import type { TopicPatch, TopicRepositoryPort, TopicRow, TopicWrite } from './topic.types.ts'

const TOPIC_COLUMNS = {
  id: topics.id,
  title: topics.title,
  description: topics.description,
  avatar_url: topics.avatar_url,
  cover_url: topics.cover_url,
  slug: topics.slug,
  status: topics.status,
  position: topics.position,
}

export class TopicRepository implements TopicRepositoryPort<Database> {
  constructor(private readonly db: Database) {}

  transaction<T>(work: (tx: Database) => Promise<T>): Promise<T> {
    return this.db.transaction((tx) => work(tx))
  }

  listActive(): Promise<TopicRow[]> {
    return this.db
      .select(TOPIC_COLUMNS)
      .from(topics)
      .where(eq(topics.status, 'active'))
      .orderBy(asc(topics.position), asc(topics.title))
  }

  listAll(tx: Database = this.db): Promise<TopicRow[]> {
    return tx.select(TOPIC_COLUMNS).from(topics).orderBy(asc(topics.position), asc(topics.title))
  }

  async findBySlug(slug: string): Promise<TopicRow | null> {
    const [row] = await this.db
      .select(TOPIC_COLUMNS)
      .from(topics)
      .where(eq(topics.slug, slug))
      .limit(1)
    return row ?? null
  }

  async findById(id: string, tx: Database = this.db): Promise<TopicRow | null> {
    const [row] = await tx.select(TOPIC_COLUMNS).from(topics).where(eq(topics.id, id)).limit(1)
    return row ?? null
  }

  async maxPosition(tx: Database): Promise<number | null> {
    const [max_row] = await tx.select({ value: max(topics.position) }).from(topics)
    return max_row?.value === null || max_row?.value === undefined ? null : Number(max_row.value)
  }

  async insert(tx: Database, row: TopicWrite & { id: string; position: number }): Promise<TopicRow> {
    const [inserted] = await tx.insert(topics).values(row).returning(TOPIC_COLUMNS)
    if (!inserted) throw new Error('topic row was not written')
    return inserted
  }

  async update(tx: Database, id: string, patch: TopicPatch): Promise<TopicRow | null> {
    const [row] = await tx.update(topics).set(patch).where(eq(topics.id, id)).returning(TOPIC_COLUMNS)
    return row ?? null
  }

  async listIds(tx: Database): Promise<string[]> {
    const rows = await tx.select({ id: topics.id }).from(topics)
    return rows.map((row) => row.id)
  }

  async setPosition(tx: Database, id: string, position: number): Promise<void> {
    await tx.update(topics).set({ position }).where(eq(topics.id, id))
  }
}
