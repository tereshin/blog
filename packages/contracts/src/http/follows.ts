import { z } from 'zod'

export const followTargetTypeSchema = z.enum(['user', 'topic'])
export type FollowTargetType = z.infer<typeof followTargetTypeSchema>

/** Тело `PUT`/`DELETE /v1/follows`. */
export const followSchema = z.strictObject({
  target_type: followTargetTypeSchema,
  target_id: z.uuid(),
})
export type Follow = z.infer<typeof followSchema>

export const followStateSchema = z.strictObject({
  target_type: followTargetTypeSchema,
  target_id: z.uuid(),
  is_following: z.boolean(),
})
export type FollowState = z.infer<typeof followStateSchema>

/** `GET /v1/me/follows` — состояния подписки по запрошенным целям или все подписки зрителя. */
export const followStatesSchema = z.strictObject({
  items: z.array(followStateSchema),
})
export type FollowStates = z.infer<typeof followStatesSchema>
