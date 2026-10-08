import { z } from 'zod'
import { topicStatusSchema } from './feed.ts'

/** 3–40 символов: `a–z`, цифры и дефис, дефис не с краю. Совпадает с реестром адресов. */
export const TOPIC_SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

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

export const createTopicSchema = z.strictObject({
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  avatar_url: z.string().nullable(),
  cover_url: z.string().nullable(),
  slug: z.string().regex(TOPIC_SLUG_PATTERN),
  position: z.number().int().optional(),
})
export type CreateTopic = z.infer<typeof createTopicSchema>

export const updateTopicSchema = createTopicSchema.partial().extend({
  status: z.enum(['active', 'archived']).optional(),
})
export type UpdateTopic = z.infer<typeof updateTopicSchema>

export const topicOrderSchema = z.strictObject({
  topic_ids: z.array(z.uuid()).min(1),
})
export type TopicOrder = z.infer<typeof topicOrderSchema>
