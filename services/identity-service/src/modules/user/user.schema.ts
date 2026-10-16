import { z } from 'zod'
import { pageQuerySchema } from '@blog/contracts'

export const UserParamsSchema = z.object({ id: z.uuid() })

export const UserListQuerySchema = pageQuerySchema.extend({
  q: z.string().trim().max(200).optional(),
  through: z.coerce.number().int().positive().optional(),
  role: z.enum(['member', 'admin', 'superadmin']).optional(),
  name_ids: z
    .string()
    .max(4000)
    .optional()
    .transform((value) => (value ? z.array(z.uuid()).max(101).parse(value.split(',')) : [])),
})

export type UserListQuery = z.infer<typeof UserListQuerySchema>
