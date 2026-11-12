import { and, eq, inArray, notInArray, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { leftSidebarSchema, type AdminNavSection, type LeftSidebar } from '@blog/contracts'
import { nav_revision, nav_sections, nav_section_items, pages } from '../../infra/db/schema.ts'
import { navError } from './nav-section.errors.ts'

export async function readNavConfig(
  database: Database,
  load: (tx: Database) => Promise<AdminNavSection[]>,
): Promise<LeftSidebar> {
  const [revision] = await database.select().from(nav_revision).where(eq(nav_revision.id, 1))
  const sections = await load(database)
  return leftSidebarSchema.parse({
    version: revision?.version,
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      items: section.items.map((item) => ({
        id: item.id,
        title: item.title,
        icon: item.icon,
        target:
          item.target.kind === 'url' ? item.target : { kind: 'page', page_id: item.target.page_id },
      })),
    })),
  })
}

export async function replaceNavConfig(database: Database, config: LeftSidebar) {
  const [revision] = await database.select().from(nav_revision).where(eq(nav_revision.id, 1))
  if (revision?.version !== config.version) throw navError('nav_version_conflict', 409)
  const page_ids = [
    ...new Set(
      config.sections.flatMap((section) =>
        section.items.flatMap((item) =>
          item.target.kind === 'page' && item.target.page_id ? [item.target.page_id] : [],
        ),
      ),
    ),
  ]
  if (page_ids.length) {
    const targets = await database
      .select({ id: pages.id })
      .from(pages)
      .where(and(inArray(pages.id, page_ids), sql`${pages.status} <> 'deleted'`))
    if (targets.length !== page_ids.length) throw navError('nav_section_page_not_found', 422)
  }
  // Null targets may only preserve existing broken links, never create a new empty link.
  const existing = await database
    .select({
      id: nav_section_items.id,
      page_id: nav_section_items.page_id,
      url: nav_section_items.url,
    })
    .from(nav_section_items)
  for (const item of config.sections.flatMap((section) => section.items)) {
    if (
      item.target.kind === 'page' &&
      item.target.page_id === null &&
      !existing.some((old) => old.id === item.id && old.page_id === null && old.url === null)
    )
      throw navError('nav_section_page_not_found', 422)
  }
  const section_ids = config.sections.map((section) => section.id)
  const item_ids = config.sections.flatMap((section) => section.items.map((item) => item.id))
  await database
    .delete(nav_section_items)
    .where(item_ids.length ? notInArray(nav_section_items.id, item_ids) : undefined)
  if (config.sections.length) {
    await database
      .insert(nav_sections)
      .values(
        config.sections.map((section, position) => ({
          id: section.id,
          title: section.title,
          position,
        })),
      )
      .onConflictDoUpdate({
        target: nav_sections.id,
        set: {
          title: sql`excluded.title`,
          position: sql`excluded.position`,
          updated_at: new Date(),
        },
      })
  }
  const items = config.sections.flatMap((section) =>
    section.items.map((item, position) => ({
      id: item.id,
      section_id: section.id,
      title: item.title,
      icon: item.icon,
      position,
      page_id: item.target.kind === 'page' ? item.target.page_id : null,
      url: item.target.kind === 'url' ? item.target.url : null,
    })),
  )
  if (items.length) {
    await database
      .insert(nav_section_items)
      .values(items)
      .onConflictDoUpdate({
        target: nav_section_items.id,
        set: {
          section_id: sql`excluded.section_id`,
          title: sql`excluded.title`,
          icon: sql`excluded.icon`,
          position: sql`excluded.position`,
          page_id: sql`excluded.page_id`,
          url: sql`excluded.url`,
          updated_at: new Date(),
        },
      })
  }
  await database
    .delete(nav_sections)
    .where(section_ids.length ? notInArray(nav_sections.id, section_ids) : undefined)
  return { ...config, version: config.version + 1 }
}
