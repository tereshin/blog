import { z } from 'zod'
import { http } from '@/shared/api'

const userSchema = z.object({
  id: z.string(),
  public_number: z.number().int(),
  role: z.enum(['member', 'admin', 'superadmin']),
  can_publish: z.boolean(),
  is_restricted: z.boolean(),
  appearance: z.enum(['light', 'dark']).nullable(),
  email: z.string().nullable(),
  email_verified: z.boolean(),
})

const profileSchema = z.object({
  display_name: z.string(),
  avatar_url: z.string().nullable(),
  slug: z.string(),
})

export const sessionSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('guest'), viewer_key: z.string().optional() }),
  z.object({ status: z.literal('member'), user: userSchema, profile: profileSchema }),
])

export type Session = z.infer<typeof sessionSchema>
export type SessionUser = z.infer<typeof userSchema>
export type SessionProfile = z.infer<typeof profileSchema>

export function getSession(signal?: AbortSignal): Promise<Session> {
  return http.get('/v1/auth/session', sessionSchema, { signal })
}
