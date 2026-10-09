import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

export const userParamsSchema = z.object({ id: z.uuid() })

export const userListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
})

export type UserListQuery = z.infer<typeof userListQuerySchema>
