import { http, HttpResponse } from 'msw'
import {
  createNavSectionItemSchema,
  createNavSectionSchema,
  navSectionItemOrderSchema,
  navSectionOrderSchema,
  publicNavSectionsSchema,
  toPublicNavSections,
  updateNavSectionItemSchema,
  updateNavSectionSchema,
} from '@blog/contracts'
import type { AdminNavSection, AdminNavSectionItem, CreateNavSectionItem } from '@blog/contracts'
import { readMockPages } from './pages.ts'
import { readMockViewer } from './session.ts'

import { NAV_SECTIONS_FIXTURE } from '../fixtures/nav-sections.ts'
import { IdempotencyReplay } from './idempotency-replay.ts'

let sections: AdminNavSection[] = structuredClone(NAV_SECTIONS_FIXTURE)
type MockBody = AdminNavSection | AdminNavSectionItem | { items: AdminNavSection[] } | null
const replays = new IdempotencyReplay<MockBody>()

function failure(code: string, status: number) {
  return HttpResponse.json({ code, title: code, status }, { status })
}
function auth() {
  return readMockViewer() === 'superadmin'
    ? null
    : failure(readMockViewer() === 'guest' ? 'unauthorized' : 'forbidden', readMockViewer() === 'guest' ? 401 : 403)
}
function shown(): AdminNavSection[] {
  return typeof localStorage !== 'undefined' && localStorage.getItem('mock_nav_sections') === 'empty'
    ? []
    : sections
}
function pageTarget(page_id: string): AdminNavSectionItem['target'] | null {
  const page = readMockPages().find((item) => item.id === page_id)
  if (!page) return null
  return { kind: 'page', page_id, slug: page.slug, status: page.status }
}
function itemFrom(input: CreateNavSectionItem, id: string, position: number): AdminNavSectionItem | Response {
  if (input.target.kind === 'url') {
    return { id, title: input.title, icon: input.icon, position, target: input.target }
  }
  const target = pageTarget(input.target.page_id)
  if (!target) return failure('nav_section_page_not_found', 422)
  return { id, title: input.title, icon: input.icon, position, target }
}

export const navSectionHandlers = [
  http.get('*/v1/nav-sections', () =>
    HttpResponse.json(publicNavSectionsSchema.parse({ items: toPublicNavSections(shown()) })),
  ),
  http.get('*/v1/admin/nav-sections', () => {
    const denied = auth()
    if (denied) return denied
    return HttpResponse.json({ items: shown() })
  }),
  http.post('*/v1/admin/nav-sections', async ({ request }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const parsed = createNavSectionSchema.safeParse(json)
    if (!parsed.success) return failure('validation_error', 400)
    const section: AdminNavSection = {
      id: crypto.randomUUID(),
      title: parsed.data.title,
      position: sections.length,
      items: [],
    }
    sections = [...sections, section]
    return replays.remember(played.key, played.input, 201, section)
  }),
  http.patch('*/v1/admin/nav-sections/order', async ({ request }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const parsed = navSectionOrderSchema.safeParse(json)
    if (!parsed.success) return failure('validation_error', 400)
    const by_id = new Map(sections.map((section) => [section.id, section]))
    if (parsed.data.section_ids.length !== sections.length || parsed.data.section_ids.some((id) => !by_id.has(id)))
      return failure('nav_section_order_invalid', 422)
    sections = parsed.data.section_ids.flatMap((id, position) => {
      const section = by_id.get(id)
      return section ? [{ ...section, position }] : []
    })
    return replays.remember(played.key, played.input, 200, { items: sections })
  }),
  http.patch('*/v1/admin/nav-sections/:id/items/order', async ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const parsed = navSectionItemOrderSchema.safeParse(json)
    const section = sections.find((item) => item.id === params.id)
    if (!section || !parsed.success) return failure(section ? 'validation_error' : 'nav_section_not_found', section ? 400 : 404)
    const by_id = new Map(section.items.map((item) => [item.id, item]))
    if (parsed.data.item_ids.length !== section.items.length || parsed.data.item_ids.some((id) => !by_id.has(id)))
      return failure('nav_section_order_invalid', 422)
    const next = {
      ...section,
      items: parsed.data.item_ids.flatMap((id, position) => {
        const item = by_id.get(id)
        return item ? [{ ...item, position }] : []
      }),
    }
    sections = sections.map((item) => (item.id === section.id ? next : item))
    return replays.remember(played.key, played.input, 200, next)
  }),
  http.post('*/v1/admin/nav-sections/:id/items', async ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const section = sections.find((item) => item.id === params.id)
    const parsed = createNavSectionItemSchema.safeParse(json)
    if (!section || !parsed.success) return failure(section ? 'validation_error' : 'nav_section_not_found', section ? 400 : 404)
    const created = itemFrom(parsed.data, crypto.randomUUID(), section.items.length)
    if (created instanceof Response) return created
    sections = sections.map((item) =>
      item.id === section.id ? { ...item, items: [...item.items, created] } : item,
    )
    return replays.remember(played.key, played.input, 201, created)
  }),
  http.patch('*/v1/admin/nav-sections/:id/items/:item_id', async ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const section = sections.find((item) => item.id === params.id)
    const current = section?.items.find((item) => item.id === params.item_id)
    const parsed = updateNavSectionItemSchema.safeParse(json)
    if (!section || !current || !parsed.success)
      return failure('nav_section_item_not_found', 404)
    const updated = itemFrom(parsed.data, current.id, current.position)
    if (updated instanceof Response) return updated
    sections = sections.map((item) =>
      item.id === section.id
        ? { ...item, items: item.items.map((entry) => (entry.id === current.id ? updated : entry)) }
        : item,
    )
    return replays.remember(played.key, played.input, 200, updated)
  }),
  http.delete('*/v1/admin/nav-sections/:id/items/:item_id', ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const played = replays.replay(request, null)
    if (played.response) return played.response
    const section = sections.find((item) => item.id === params.id)
    if (!section?.items.some((item) => item.id === params.item_id)) return failure('nav_section_item_not_found', 404)
    sections = sections.map((item) =>
      item.id === section.id ? { ...item, items: item.items.filter((entry) => entry.id !== params.item_id) } : item,
    )
    return replays.remember(played.key, played.input, 204, null)
  }),
  http.patch('*/v1/admin/nav-sections/:id', async ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const json: unknown = await request.json()
    const played = replays.replay(request, json)
    if (played.response) return played.response
    const parsed = updateNavSectionSchema.safeParse(json)
    const section = sections.find((item) => item.id === params.id)
    if (!section || !parsed.success) return failure(section ? 'validation_error' : 'nav_section_not_found', section ? 400 : 404)
    const next = { ...section, title: parsed.data.title }
    sections = sections.map((item) => (item.id === section.id ? next : item))
    return replays.remember(played.key, played.input, 200, next)
  }),
  http.delete('*/v1/admin/nav-sections/:id', ({ request, params }) => {
    const denied = auth()
    if (denied) return denied
    const played = replays.replay(request, null)
    if (played.response) return played.response
    if (!sections.some((item) => item.id === params.id)) return failure('nav_section_not_found', 404)
    sections = sections.filter((item) => item.id !== params.id)
    return replays.remember(played.key, played.input, 204, null)
  }),
]
