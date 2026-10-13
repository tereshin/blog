import { http, emptyResponseSchema } from '@/shared/api'
import {
  adminNavSectionItemSchema,
  adminNavSectionSchema,
  adminNavSectionsSchema,
  publicNavSectionsSchema,
} from '@blog/contracts'
import type {
  CreateNavSectionItem,
  PublicNavSections,
  UpdateNavSectionItem,
} from '@blog/contracts'

export const navSectionKeys = {
  all: ['nav-sections'] as const,
  public: () => [...navSectionKeys.all, 'public'] as const,
  admin: () => [...navSectionKeys.all, 'admin'] as const,
}

export const getNavSections = (signal?: AbortSignal) =>
  http.get('/v1/nav-sections', publicNavSectionsSchema, signal ? { signal } : {})

export const listAdminNavSections = (signal?: AbortSignal) =>
  http.get('/v1/admin/nav-sections', adminNavSectionsSchema, signal ? { signal } : {})

export const createNavSection = (title: string) =>
  http.post('/v1/admin/nav-sections', adminNavSectionSchema, { body: { title } })

export const updateNavSection = (id: string, title: string) =>
  http.patch(`/v1/admin/nav-sections/${id}`, adminNavSectionSchema, { body: { title } })

export const deleteNavSection = (id: string) =>
  http.delete(`/v1/admin/nav-sections/${id}`, emptyResponseSchema)

export const reorderNavSections = (section_ids: readonly string[]) =>
  http.patch('/v1/admin/nav-sections/order', adminNavSectionsSchema, { body: { section_ids } })

export const createNavSectionItem = (section_id: string, body: CreateNavSectionItem) =>
  http.post(`/v1/admin/nav-sections/${section_id}/items`, adminNavSectionItemSchema, { body })

export const updateNavSectionItem = (
  section_id: string,
  item_id: string,
  body: UpdateNavSectionItem,
) =>
  http.patch(`/v1/admin/nav-sections/${section_id}/items/${item_id}`, adminNavSectionItemSchema, {
    body,
  })

export const deleteNavSectionItem = (section_id: string, item_id: string) =>
  http.delete(`/v1/admin/nav-sections/${section_id}/items/${item_id}`, emptyResponseSchema)

export const reorderNavSectionItems = (section_id: string, item_ids: readonly string[]) =>
  http.patch(`/v1/admin/nav-sections/${section_id}/items/order`, adminNavSectionSchema, {
    body: { item_ids },
  })

export type { PublicNavSections }
