import { z } from 'zod'
import { http } from '@/shared/api'

export const adminUserSchema = z.object({
  id: z.string(),
  public_number: z.number(),
  email: z.string(),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  created_at: z.string(),
})

const pageSchema = z.object({
  items: z.array(adminUserSchema),
  next_cursor: z.string().nullable(),
})

export type AdminUser = z.infer<typeof adminUserSchema>

export function searchMembers(q: string, signal?: AbortSignal): Promise<AdminUser[]> {
  return http.get('/v1/users', pageSchema, { query: { q }, ...(signal ? { signal } : {}) }).then((page) => page.items)
}

export function setMemberRole(id: string, role: 'member' | 'admin'): Promise<AdminUser> {
  return http.patch(`/v1/users/${id}/role`, adminUserSchema, { body: { role } })
}

export function setMemberPublishing(id: string, can_publish: boolean): Promise<AdminUser> {
  return http.patch(`/v1/users/${id}/publishing`, adminUserSchema, { body: { can_publish } })
}

export function restrictMember(id: string): Promise<AdminUser> {
  return http.post(`/v1/users/${id}/restrict`, adminUserSchema, { body: {} })
}

export function unrestrictMember(id: string): Promise<AdminUser> {
  return http.delete(`/v1/users/${id}/restrict`, adminUserSchema)
}
