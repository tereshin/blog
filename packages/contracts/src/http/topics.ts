import { z } from 'zod'
import { topicStatusSchema } from './feed.ts'

export const topicSchema = z.strictObject({
  id: z.uuid(),
  title: z.string(),
  description: z.string().nullable(),
  avatar_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  slug: z.string(),
  status: topicStatusSchema,
  position: z.number().int(),
})
export type Topic = z.infer<typeof topicSchema>

/** `GET /v1/topics` — только активные, по `position`. */
export const topicListSchema = z.array(topicSchema)
