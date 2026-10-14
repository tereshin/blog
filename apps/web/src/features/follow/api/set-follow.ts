import { z } from 'zod'
import { http } from '@/shared/api'

const followStateSchema = z.object({
  target_type: z.enum(['user', 'topic']),
  target_id: z.string(),
  is_following: z.boolean(),
})

export type FollowState = z.infer<typeof followStateSchema>

export function setFollow(
  target: { target_type: 'user' | 'topic'; target_id: string },
  is_following: boolean,
): Promise<FollowState> {
  const body = { target_type: target.target_type, target_id: target.target_id }
  return is_following
    ? http.put('/v1/follows', followStateSchema, { body })
    : http.delete('/v1/follows', followStateSchema, { body })
}
