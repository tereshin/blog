import { z } from 'zod'

/** `topic:{id}` из модели или `topic:{slug}` — тот же режим, что у ленты. */
const topicFeedKeySchema = z.string().regex(/^topic:[a-z0-9][a-z0-9-]*$/i)

/** `fresh` | `popular` | `mine` | `topic:{id}` — ключ полосы просмотренного. */
export const feedKeySchema = z.union([z.enum(['fresh', 'popular', 'mine']), topicFeedKeySchema])
export type FeedKey = z.infer<typeof feedKeySchema>

export const feedSeenSchema = z.strictObject({
  feed_key: feedKeySchema,
  article_id: z.uuid(),
})
export type FeedSeen = z.infer<typeof feedSeenSchema>

/** `GET /v1/feed-seen` — не больше 500 последних статей этой ленты. */
export const feedSeenListSchema = z.strictObject({
  article_ids: z.array(z.uuid()).max(500),
})
export type FeedSeenList = z.infer<typeof feedSeenListSchema>
