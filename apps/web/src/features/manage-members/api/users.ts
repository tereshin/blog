import { z } from 'zod'
import { http, emptyResponseSchema } from '@/shared/api'

export const adminUserSchema = z.object({
  id: z.string(),
  public_number: z.number(),
  email: z.string(),
  email_verified: z.boolean(),
  display_name: z.string().default(''),
  slug: z.string().nullable().default(null),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  created_at: z.string(),
})
const pageSchema = z.object({ items: z.array(adminUserSchema), next_cursor: z.string().nullable() })
export type AdminUser = z.infer<typeof adminUserSchema>
export type MemberFilters = { q: string; role: string }
export function getMembers(filters: MemberFilters, cursor?: string, signal?: AbortSignal) {
  return http.get('/v1/users', pageSchema, {
    query: { q: filters.q, role: filters.role || undefined, cursor, limit: 25 },
    signal,
  })
}
export async function searchMembers(q: string, signal?: AbortSignal): Promise<AdminUser[]> {
  return (await getMembers({ q, role: '' }, undefined, signal)).items
}
export function setMemberRole(id: string, role: 'member' | 'admin') {
  return http.patch(`/v1/users/${id}/role`, adminUserSchema, { body: { role } })
}
export function setMemberPublishing(id: string, can_publish: boolean) {
  return http.patch(`/v1/users/${id}/publishing`, adminUserSchema, { body: { can_publish } })
}
export function restrictMember(id: string) {
  return http.put(`/v1/users/${id}/restriction`, adminUserSchema, { body: {} })
}
export function unrestrictMember(id: string) {
  return http.delete(`/v1/users/${id}/restriction`, adminUserSchema)
}
export function deleteMember(id: string) {
  return http.delete(`/v1/users/${id}`, emptyResponseSchema)
}
export async function editMember(input: {
  id: string
  display_name: string
  role: 'member' | 'admin'
  can_publish: boolean
  previous: AdminUser
}) {
  if (input.display_name !== input.previous.display_name)
    await http.patch(`/v1/admin/profiles/${input.id}`, z.object({ user_id: z.string() }), {
      body: { display_name: input.display_name },
    })
  if (input.role !== input.previous.role) await setMemberRole(input.id, input.role)
  if (input.can_publish !== input.previous.can_publish)
    await setMemberPublishing(input.id, input.can_publish)
}
export function confirmMemberEmail(id: string) {
  return http.put(`/v1/users/${id}/email-verification`, emptyResponseSchema, { body: {} })
}
