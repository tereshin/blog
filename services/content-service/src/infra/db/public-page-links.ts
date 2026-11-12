import { and, eq, inArray } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { pages } from './schema.ts'

export async function publicPageLinks(db: Database, ids: string[]) {
  if (!ids.length) return new Map<string, string>()
  const rows = await db
    .select({ id: pages.id, slug: pages.slug })
    .from(pages)
    .where(and(inArray(pages.id, ids), eq(pages.status, 'published')))
  return new Map(rows.map((row) => [row.id, '/pages/' + row.slug]))
}
