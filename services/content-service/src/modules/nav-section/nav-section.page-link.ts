import { eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { nav_section_items } from '../../infra/db/schema.ts'

/** Мягкое удаление страницы не снимает внешний ключ, поэтому ссылку обнуляем здесь. */
export async function detachPageFromNavItems(
  tx: Database,
  page_id: string,
  updated_at: Date,
): Promise<void> {
  await tx
    .update(nav_section_items)
    .set({ page_id: null, updated_at })
    .where(eq(nav_section_items.page_id, page_id))
}
