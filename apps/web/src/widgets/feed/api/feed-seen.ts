import { z } from 'zod'
import { http } from '@/shared/api'

const seenSchema = z.object({
  feed_key: z.string(),
  article_id: z.string(),
})
const seenListSchema = z.object({ article_ids: z.array(z.string()) })

export type SeenList = z.infer<typeof seenListSchema>

export const seenKeys = {
  all: ['feed-seen'] as const,
  list: (feed_key: string) => [...seenKeys.all, feed_key] as const,
}

export function getSeenArticles(feed_key: string, signal?: AbortSignal): Promise<SeenList> {
  return http.get('/v1/feed-seen', seenListSchema, { query: { feed_key }, signal })
}

/** Запоминает просмотр, не пряча карточку в этом же заходе: полоса появится при следующем открытии ленты. */
export async function markSeenArticle(feed_key: string, article_id: string): Promise<void> {
  await http.put('/v1/feed-seen', seenSchema, { body: { feed_key, article_id } })
}
