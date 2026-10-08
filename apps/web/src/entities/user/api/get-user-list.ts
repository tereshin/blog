import { z } from 'zod'
import { http } from '@/shared/api'
import type { UserListItemModel, UserListPage } from '../model/user-types.ts'

const itemSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  slug: z.string(),
  reputation: z.number().int(),
})

const pageSchema = z.object({
  items: z.array(itemSchema),
  next_cursor: z.string().nullable(),
})

function toItem(dto: z.infer<typeof itemSchema>): UserListItemModel {
  return { ...dto, href: `/u/${encodeURIComponent(dto.slug)}` }
}

function toPage(dto: z.infer<typeof pageSchema>): UserListPage {
  return { items: dto.items.map(toItem), next_cursor: dto.next_cursor }
}

export function getFollowers(slug: string, cursor: string | null, signal?: AbortSignal): Promise<UserListPage> {
  return http.get(`/v1/profiles/${encodeURIComponent(slug)}/followers`, pageSchema, { query: { cursor: cursor ?? undefined }, signal }).then(toPage)
}

export function getFollowing(slug: string, cursor: string | null, signal?: AbortSignal): Promise<UserListPage> {
  return http.get(`/v1/profiles/${encodeURIComponent(slug)}/following`, pageSchema, { query: { cursor: cursor ?? undefined }, signal }).then(toPage)
}

export function getRating(cursor: string | null, signal?: AbortSignal): Promise<UserListPage> {
  return http.get('/v1/rating', pageSchema, { query: { cursor: cursor ?? undefined }, signal }).then(toPage)
}