import { z } from 'zod'
import { feedCardSchema } from './feed.ts'
import { userListItemSchema } from './profiles.ts'
import { topicSchema } from './topics.ts'

/** `GET /v1/search?q=&cursor=` — статьи, люди и темы, которые зрителю можно видеть. */
export const searchResponseSchema = z.strictObject({
  articles: z.array(feedCardSchema),
  people: z.array(userListItemSchema),
  topics: z.array(topicSchema),
  next_cursor: z.string().nullable(),
})
export type SearchResponse = z.infer<typeof searchResponseSchema>
