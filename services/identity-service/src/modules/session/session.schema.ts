import { z } from 'zod'

export const SessionParamsSchema = z.object({
  session_id: z.string().regex(/^[A-Za-z0-9_-]{16,128}$/),
})

export const ActiveSessionSchema = z.strictObject({
  user_id: z.uuid(),
  role: z.enum(['member', 'admin', 'superadmin']),
  is_restricted: z.boolean(),
  can_publish: z.boolean(),
  email_verified: z.boolean(),
})
