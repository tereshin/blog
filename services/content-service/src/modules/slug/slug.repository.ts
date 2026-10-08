import { and, eq, ne } from 'drizzle-orm'
import { slugs } from '../../infra/db/schema.ts'
import type { SlugRepository } from './slug.types.ts'

export const slugRepository: SlugRepository = {
  async insert(tx, slug, owner_type, owner_id) {
    const inserted = await tx.insert(slugs).values({ slug, owner_type, owner_id }).onConflictDoNothing().returning({ slug: slugs.slug })
    return inserted.length > 0
  },
  async findOwner(tx, slug) {
    const [row] = await tx.select({ owner_type: slugs.owner_type, owner_id: slugs.owner_id }).from(slugs).where(eq(slugs.slug, slug)).limit(1)
    return row ?? null
  },
  async deleteByOwner(tx, owner_type, owner_id, keep) {
    const owned = and(eq(slugs.owner_type, owner_type), eq(slugs.owner_id, owner_id))
    await tx.delete(slugs).where(keep === undefined ? owned : and(owned, ne(slugs.slug, keep)))
  },
}
