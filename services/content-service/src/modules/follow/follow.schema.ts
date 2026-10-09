import { z } from 'zod'
import { followSchema, followTargetTypeSchema } from '@blog/contracts'

export const followBodySchema = followSchema

export const followQuerySchema = z.object({
  target_type: followTargetTypeSchema.optional(),
  target_ids: z.string().optional(),
})
export type FollowQuery = z.infer<typeof followQuerySchema>
