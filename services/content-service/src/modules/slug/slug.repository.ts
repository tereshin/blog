import { and, eq, ne } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { slugs } from '../../infra/db/schema.ts'
import type { SlugOwnerType, SlugRepositoryPort } from './slug.types.ts'

export class SlugRepository implements SlugRepositoryPort<Database> {
  async insert(tx: Database, slug: string, owner_type: SlugOwnerType, owner_id: string): Promise<boolean> {
    const inserted = await tx.insert(slugs).values({ slug, owner_type, owner_id }).onConflictDoNothing().returning({ slug: slugs.slug })
    return inserted.length > 0
  }

  async findOwner(tx: Database, slug: string): Promise<{ owner_type: SlugOwnerType; owner_id: string } | null> {
    const [row] = await tx.select({ owner_type: slugs.owner_type, owner_id: slugs.owner_id }).from(slugs).where(eq(slugs.slug, slug)).limit(1)
    return row ?? null
  }

  async deleteByOwner(tx: Database, owner_type: SlugOwnerType, owner_id: string, keep?: string): Promise<void> {
    const owned = and(eq(slugs.owner_type, owner_type), eq(slugs.owner_id, owner_id))
    await tx.delete(slugs).where(keep === undefined ? owned : and(owned, ne(slugs.slug, keep)))
  }

  async listAll(tx: Database): Promise<string[]> {
    const rows = await tx.select({ slug: slugs.slug }).from(slugs)
    return rows.map((row) => row.slug)
  }
}
