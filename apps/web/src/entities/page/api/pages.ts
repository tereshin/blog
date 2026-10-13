import { adminPageSchema, adminPagesSchema, publicPageSchema } from '@blog/contracts'
import type { CreatePage, UpdatePage, AdminPagesQuery } from '@blog/contracts'
import { http, emptyResponseSchema } from '@/shared/api'
export const pageKeys = {
  lists: ['pages', 'admin', 'list'] as const,
  list: (status: string) => ['pages', 'admin', 'list', status] as const,
  admin: (id: string) => ['pages', 'admin', id] as const,
  public: (slug: string) => ['pages', 'public', slug] as const,
}
export const listPages = (query: AdminPagesQuery, signal?: AbortSignal) =>
  http.get('/v1/admin/pages', adminPagesSchema, { query, ...(signal ? { signal } : {}) })
export const getAdminPage = (id: string, signal?: AbortSignal) =>
  http.get(`/v1/admin/pages/${encodeURIComponent(id)}`, adminPageSchema, signal ? { signal } : {})
export const getPublicPage = (slug: string, signal?: AbortSignal) =>
  http.get(`/v1/pages/${encodeURIComponent(slug)}`, publicPageSchema, signal ? { signal } : {})
export const createPage = (body: CreatePage, idempotency_key: string) =>
  http.post('/v1/admin/pages', adminPageSchema, { body, idempotency_key })
export const updatePage = (id: string, body: UpdatePage, idempotency_key: string) =>
  http.patch(`/v1/admin/pages/${id}`, adminPageSchema, { body, idempotency_key })
export const deletePage = (id: string, expected_version: number, idempotency_key: string) =>
  http.delete(`/v1/admin/pages/${id}`, emptyResponseSchema, {
    body: { expected_version },
    idempotency_key,
  })
