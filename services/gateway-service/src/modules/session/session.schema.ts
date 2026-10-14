import { z } from 'zod'
import { sessionUserSchema } from '@blog/contracts'

/** Ответ identity на `GET /v1/auth/session` для участника. */
export const IdentityMemberSchema = z.object({
  status: z.literal('member'),
  user: sessionUserSchema,
  display_name_hint: z.string(),
})
export type IdentityMember = z.infer<typeof IdentityMemberSchema>
