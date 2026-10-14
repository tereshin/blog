import { z } from 'zod'
import { followSchema, followTargetTypeSchema } from '@blog/contracts'

export const FollowBodySchema = followSchema

export const FollowQuerySchema = z.object({
  target_type: followTargetTypeSchema.optional(),
  target_ids: z.string().optional(),
})
export type FollowQuery = z.infer<typeof FollowQuerySchema>
