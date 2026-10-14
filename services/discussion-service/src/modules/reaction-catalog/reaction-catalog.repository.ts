import { eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { reaction_catalog } from '../../infra/db/schema.ts'
import type { ReactionCatalogRepositoryPort } from './reaction-catalog.types.ts'

export class ReactionCatalogRepository implements ReactionCatalogRepositoryPort<Database> {
  /** Заменяет набор видов, которые ещё можно поставить. Пустой список оставляет каталог пустым. */
  async replaceActiveKinds(tx: Database, kinds: readonly string[]): Promise<void> {
    await tx.delete(reaction_catalog)
    if (kinds.length === 0) return
    await tx.insert(reaction_catalog).values(kinds.map((kind) => ({ kind })))
  }

  async isActiveKind(tx: Database, kind: string): Promise<boolean> {
    const [row] = await tx
      .select({ kind: reaction_catalog.kind })
      .from(reaction_catalog)
      .where(eq(reaction_catalog.kind, kind))
      .limit(1)
    return row !== undefined
  }
}
