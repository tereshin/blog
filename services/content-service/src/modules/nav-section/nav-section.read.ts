import { asc, eq } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import type { AdminNavSection, AdminNavSectionItem } from '@blog/contracts'
import { nav_sections, nav_section_items, pages } from '../../infra/db/schema.ts'
import { toAdminItem } from './nav-section.mapper.ts'
export async function loadNavSections(database: Database): Promise<AdminNavSection[]> {
  const sections = await database
    .select({
      id: nav_sections.id,
      title: nav_sections.title,
      position: nav_sections.position,
    })
    .from(nav_sections)
    .orderBy(asc(nav_sections.position), asc(nav_sections.id))
  const rows = await database
    .select({
      id: nav_section_items.id,
      section_id: nav_section_items.section_id,
      title: nav_section_items.title,
      icon: nav_section_items.icon,
      page_id: nav_section_items.page_id,
      url: nav_section_items.url,
      position: nav_section_items.position,
      page_slug: pages.slug,
      page_status: pages.status,
    })
    .from(nav_section_items)
    .leftJoin(pages, eq(nav_section_items.page_id, pages.id))
    .orderBy(asc(nav_section_items.position), asc(nav_section_items.id))
  const items_by_section = new Map<string, AdminNavSectionItem[]>()
  for (const row of rows) {
    const list = items_by_section.get(row.section_id) ?? []
    list.push(toAdminItem(row))
    items_by_section.set(row.section_id, list)
  }
  return sections.map((section) => ({ ...section, items: items_by_section.get(section.id) ?? [] }))
}
