import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

export const UserParamsSchema = z.object({ id: z.uuid() })

export const UserListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
})

export type UserListQuery = z.infer<typeof UserListQuerySchema>
