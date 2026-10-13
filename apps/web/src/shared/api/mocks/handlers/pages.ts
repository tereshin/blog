import { http, HttpResponse } from 'msw'
import {
  createPageSchema,
  updatePageSchema,
  publicPageSchema,
  adminPageSummarySchema,
} from '@blog/contracts'
import type { AdminPage } from '@blog/contracts'
import { readMockViewer } from './session.ts'
const ACTOR = '11111111-1111-4111-8111-111111111111'
const CREATED = '2026-10-12T10:00:00.000Z'
const stored = new Map<string, AdminPage>([
  [
    '33333333-3333-4333-8333-333333333333',
    {
      id: '33333333-3333-4333-8333-333333333333',
      title: 'Добро пожаловать',
      slug: 'welcome-page',
      status: 'published',
      version: 1,
      blocks: { blocks: [{ type: 'paragraph', data: { text: 'Информация о площадке' } }] },
      created_by: ACTOR,
      updated_by: ACTOR,
      created_at: CREATED,
      updated_at: CREATED,
      published_at: CREATED,
    },
  ],
])
const deleted = new Set<string>()
const results = new Map<string, { input: string; body: AdminPage | null; status: number }>()
function failure(code: string, status: number) {
  return HttpResponse.json({ code, title: code, status }, { status })
}
function auth() {
  return readMockViewer() === 'superadmin'
    ? null
    : failure(
        readMockViewer() === 'guest' ? 'unauthorized' : 'forbidden',
        readMockViewer() === 'guest' ? 401 : 403,
      )
}
export function readMockPages() {
  return [...stored.values()].filter((page) => !deleted.has(page.id))
}
function replay(request: Request, body: unknown) {
  const key = request.headers.get('X-Idempotency-Key') ?? ''
  const input = JSON.stringify({
    path: new URL(request.url).pathname,
    method: request.method,
    body,
  })
  const previous = results.get(key)
  return {
    key,
    input,
    response: previous
      ? previous.input !== input
        ? failure('idempotency_key_conflict', 409)
        : previous.status === 204
          ? new HttpResponse(null, { status: 204 })
          : HttpResponse.json(previous.body, { status: previous.status })
      : null,
  }
}
export const pageHandlers = [
  http.get('*/v1/pages/:slug', ({ params }) => {
    const page = readMockPages().find(
      (item) => item.slug === params.slug && item.status === 'published',
    )
    if (!page) return failure('page_not_found', 404)
    return HttpResponse.json(publicPageSchema.strip().parse(page))
  }),
  http.get('*/v1/admin/pages', ({ request }) => {
    const denied = auth()
    if (denied) return denied
    const query = new URL(request.url).searchParams
    const rows = readMockPages().filter(
      (item) => !query.get('status') || item.status === query.get('status'),
    )
    const start = Number(query.get('cursor') ?? 0),
      limit = Number(query.get('limit') ?? 20)
    return HttpResponse.json({
      items: rows
        .slice(start, start + limit)
        .map((page) => adminPageSummarySchema.strip().parse(page)),
      next_cursor: rows.length > start + limit ? String(start + limit) : null,
    })
  }),
  http.get('*/v1/admin/pages/:id', ({ params }) => {
    const denied = auth()
    if (denied) return denied
    const page = stored.get(String(params.id))
    return page && !deleted.has(page.id) ? HttpResponse.json(page) : failure('page_not_found', 404)
  }),
  http.post('*/v1/admin/pages', async ({ request }) => {
    const denied = auth()
    if (denied) return denied
    const raw = await request.json(),
      op = replay(request, raw)
    if (op.response) return op.response
    const parsed = createPageSchema.safeParse(raw)
    if (!parsed.success) return failure('validation_error', 400)
    if ([...stored.values()].some((p) => p.slug === parsed.data.slug))
      return failure('page_slug_taken', 409)
    const now = new Date().toISOString()
    const page: AdminPage = {
      ...parsed.data,
      id: crypto.randomUUID(),
      version: 1,
      status: 'draft',
      created_by: ACTOR,
      updated_by: ACTOR,
      created_at: now,
      updated_at: now,
      published_at: null,
    }
    stored.set(page.id, page)
    results.set(op.key, { input: op.input, body: page, status: 201 })
    return HttpResponse.json(page, { status: 201 })
  }),
  http.patch('*/v1/admin/pages/:id', async ({ params, request }) => {
    const denied = auth()
    if (denied) return denied
    const raw = await request.json(),
      op = replay(request, raw)
    if (op.response) return op.response
    const parsed = updatePageSchema.safeParse(raw)
    if (!parsed.success) return failure('validation_error', 400)
    const page = stored.get(String(params.id))
    if (!page || deleted.has(page.id)) return failure('page_not_found', 404)
    const { expected_version, ...fields } = parsed.data
    if (expected_version !== page.version) return failure('page_version_conflict', 409)
    if (page.published_at && fields.slug && fields.slug !== page.slug)
      return failure('page_slug_locked', 409)
    if (fields.slug && [...stored.values()].some((p) => p.id !== page.id && p.slug === fields.slug))
      return failure('page_slug_taken', 409)
    const now = new Date().toISOString(),
      next = {
        ...page,
        ...fields,
        version: page.version + 1,
        updated_at: now,
        published_at: page.published_at ?? (fields.status === 'published' ? now : null),
      }
    if (
      next.status === 'published' &&
      !next.blocks.blocks.some(
        (b) => b.type !== 'delimiter' && (b.type !== 'paragraph' || b.data.text.trim()),
      )
    )
      return failure('page_not_publishable', 422)
    stored.set(page.id, next)
    results.set(op.key, { input: op.input, body: next, status: 200 })
    return HttpResponse.json(next)
  }),
  http.delete('*/v1/admin/pages/:id', async ({ params, request }) => {
    const denied = auth()
    if (denied) return denied
    const raw = (await request.json()) as { expected_version: number },
      op = replay(request, raw)
    if (op.response) return op.response
    const page = stored.get(String(params.id))
    if (!page || deleted.has(page.id)) return failure('page_not_found', 404)
    if (page.version !== raw.expected_version) return failure('page_version_conflict', 409)
    deleted.add(page.id)
    results.set(op.key, { input: op.input, body: null, status: 204 })
    return new HttpResponse(null, { status: 204 })
  }),
]
