import { randomUUID } from 'node:crypto'
import { and, asc, count, eq, max, sql } from 'drizzle-orm'
import type { Database } from '@blog/broker'
import { MAX_NAV_SECTION_ITEMS, MAX_NAV_SECTIONS } from '@blog/contracts'
import type { AdminNavSection, AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { nav_section_items, nav_section_mutations, nav_sections, pages } from '../../infra/db/schema.ts'
import { navError } from './nav-section.errors.ts'
import { toAdminItem } from './nav-section.mapper.ts'
import type { MutationOperation } from './nav-section.mapper.ts'

type MutationResult<T> = { status: number; body: T | null }

function targetFields(input: CreateNavSectionItem) {
  return input.target.kind === 'page'
    ? { page_id: input.target.page_id, url: null }
    : { page_id: null, url: input.target.url }
}

export function createNavSectionRepository(db: Database) {
  async function load(database: Database): Promise<AdminNavSection[]> {
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

  async function mutate<T>(
    operation: MutationOperation,
    run: (database: Database) => Promise<MutationResult<T>>,
  ): Promise<MutationResult<T>> {
    return db.transaction(async (tx) => {
      const database = tx as Database
      await database.execute(
        sql`SELECT pg_advisory_xact_lock(hashtextextended(${operation.actor_id + ':' + operation.key}, 0))`,
      )
      const [previous] = await database
        .select()
        .from(nav_section_mutations)
        .where(
          and(
            eq(nav_section_mutations.actor_id, operation.actor_id),
            eq(nav_section_mutations.idempotency_key, operation.key),
          ),
        )
        .limit(1)
      if (previous) {
        if (previous.request_fingerprint !== operation.fingerprint)
          throw navError('idempotency_key_conflict', 409)
        return { status: previous.response_status, body: previous.response_body as T | null }
      }
      await database.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended('nav-sections', 0))`)
      const result = await run(database)
      await database.insert(nav_section_mutations).values({
        actor_id: operation.actor_id,
        idempotency_key: operation.key,
        request_fingerprint: operation.fingerprint,
        response_status: result.status,
        response_body: result.body,
      })
      return result
    })
  }

  async function requireSection(database: Database, id: string) {
    const [row] = await database
      .select({ id: nav_sections.id })
      .from(nav_sections)
      .where(eq(nav_sections.id, id))
      .limit(1)
    if (!row) throw navError('nav_section_not_found', 404)
  }

  async function assertPage(database: Database, page_id: string) {
    const [page] = await database
      .select({ status: pages.status })
      .from(pages)
      .where(eq(pages.id, page_id))
      .limit(1)
    if (!page || page.status === 'deleted') throw navError('nav_section_page_not_found', 422)
  }

  async function readSection(database: Database, id: string): Promise<AdminNavSection> {
    const section = (await load(database)).find((item) => item.id === id)
    if (!section) throw navError('nav_section_not_found', 404)
    return section
  }

  return {
    list: () => load(db),
    createSection(operation: MutationOperation, title: string) {
      return mutate(operation, async (database) => {
        const [row] = await database.select({ value: count() }).from(nav_sections)
        if (Number(row?.value ?? 0) >= MAX_NAV_SECTIONS) throw navError('nav_section_limit', 422)
        const [max_row] = await database.select({ value: max(nav_sections.position) }).from(nav_sections)
        const position = max_row?.value == null ? 0 : Number(max_row.value) + 1
        const id = randomUUID()
        await database.insert(nav_sections).values({ id, title, position })
        return { status: 201, body: await readSection(database, id) }
      })
    },
    updateSection(operation: MutationOperation, id: string, title: string) {
      return mutate(operation, async (database) => {
        const [row] = await database
          .update(nav_sections)
          .set({ title, updated_at: new Date() })
          .where(eq(nav_sections.id, id))
          .returning({ id: nav_sections.id })
        if (!row) throw navError('nav_section_not_found', 404)
        return { status: 200, body: await readSection(database, id) }
      })
    },
    deleteSection(operation: MutationOperation, id: string) {
      return mutate(operation, async (database) => {
        const [row] = await database
          .delete(nav_sections)
          .where(eq(nav_sections.id, id))
          .returning({ id: nav_sections.id })
        if (!row) throw navError('nav_section_not_found', 404)
        return { status: 204, body: null }
      })
    },
    reorderSections(operation: MutationOperation, section_ids: readonly string[]) {
      return mutate(operation, async (database) => {
        const rows = await database.select({ id: nav_sections.id }).from(nav_sections)
        const current = rows.map((row) => row.id)
        const same = section_ids.length === current.length && section_ids.every((id) => current.includes(id))
        if (!same) throw navError('nav_section_order_invalid', 422)
        const now = new Date()
        for (const [index, id] of section_ids.entries()) {
          await database.update(nav_sections).set({ position: index, updated_at: now }).where(eq(nav_sections.id, id))
        }
        return { status: 200, body: { items: await load(database) } }
      })
    },
    createItem(operation: MutationOperation, section_id: string, input: CreateNavSectionItem) {
      return mutate(operation, async (database) => {
        await requireSection(database, section_id)
        const [row] = await database
          .select({ value: count() })
          .from(nav_section_items)
          .where(eq(nav_section_items.section_id, section_id))
        if (Number(row?.value ?? 0) >= MAX_NAV_SECTION_ITEMS) throw navError('nav_section_item_limit', 422)
        if (input.target.kind === 'page') await assertPage(database, input.target.page_id)
        const [max_row] = await database
          .select({ value: max(nav_section_items.position) })
          .from(nav_section_items)
          .where(eq(nav_section_items.section_id, section_id))
        const position = max_row?.value == null ? 0 : Number(max_row.value) + 1
        const id = randomUUID()
        await database.insert(nav_section_items).values({
          id,
          section_id,
          title: input.title,
          icon: input.icon,
          position,
          ...targetFields(input),
        })
        const section = await readSection(database, section_id)
        const item = section.items.find((entry) => entry.id === id)
        if (!item) throw navError('nav_section_item_not_found', 404)
        return { status: 201, body: item }
      })
    },
    updateItem(
      operation: MutationOperation,
      section_id: string,
      item_id: string,
      input: CreateNavSectionItem,
    ) {
      return mutate(operation, async (database) => {
        if (input.target.kind === 'page') await assertPage(database, input.target.page_id)
        const [row] = await database
          .update(nav_section_items)
          .set({
            title: input.title,
            icon: input.icon,
            updated_at: new Date(),
            ...targetFields(input),
          })
          .where(and(eq(nav_section_items.id, item_id), eq(nav_section_items.section_id, section_id)))
          .returning({ id: nav_section_items.id })
        if (!row) throw navError('nav_section_item_not_found', 404)
        const section = await readSection(database, section_id)
        const item = section.items.find((entry) => entry.id === item_id)
        if (!item) throw navError('nav_section_item_not_found', 404)
        return { status: 200, body: item }
      })
    },
    deleteItem(operation: MutationOperation, section_id: string, item_id: string) {
      return mutate(operation, async (database) => {
        const [row] = await database
          .delete(nav_section_items)
          .where(and(eq(nav_section_items.id, item_id), eq(nav_section_items.section_id, section_id)))
          .returning({ id: nav_section_items.id })
        if (!row) throw navError('nav_section_item_not_found', 404)
        return { status: 204, body: null }
      })
    },
    reorderItems(operation: MutationOperation, section_id: string, item_ids: readonly string[]) {
      return mutate(operation, async (database) => {
        await requireSection(database, section_id)
        const rows = await database
          .select({ id: nav_section_items.id })
          .from(nav_section_items)
          .where(eq(nav_section_items.section_id, section_id))
        const current = rows.map((row) => row.id)
        const same = item_ids.length === current.length && item_ids.every((id) => current.includes(id))
        if (!same) throw navError('nav_section_order_invalid', 422)
        const now = new Date()
        for (const [index, id] of item_ids.entries()) {
          await database
            .update(nav_section_items)
            .set({ position: index, updated_at: now })
            .where(eq(nav_section_items.id, id))
        }
        return { status: 200, body: await readSection(database, section_id) }
      })
    },
  }
}

export type NavSectionRepository = ReturnType<typeof createNavSectionRepository>
