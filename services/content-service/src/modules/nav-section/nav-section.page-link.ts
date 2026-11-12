import { eq, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { nav_section_items, nav_revision } from '../../infra/db/schema.ts'

/** Мягкое удаление страницы не снимает внешний ключ, поэтому ссылку обнуляем здесь. */
export async function detachPageFromNavItems(
  tx: Database,
  page_id: string,
  updated_at: Date,
): Promise<void> {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('nav-sections', 0))`)
  const changed = await tx
    .update(nav_section_items)
    .set({ page_id: null, updated_at })
    .where(eq(nav_section_items.page_id, page_id)).returning({ id: nav_section_items.id })
  if (changed.length) await tx.update(nav_revision).set({ version: sql`${nav_revision.version} + 1` }).where(eq(nav_revision.id, 1))
}
