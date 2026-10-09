import { z } from 'zod'
import { http } from '@/shared/api'
import { feedCardDtoSchema, toArticleCard } from './feed-schema.ts'
import type { ArticleCardModel } from '../model/article-types.ts'

const bookmarkPageSchema = z.object({
  article_ids: z.array(z.string()),
  next_cursor: z.string().nullable().optional(),
})

/** Закладки участника в том порядке, в каком их вернул сервер. */
export async function getBookmarks(signal?: AbortSignal): Promise<ArticleCardModel[]> {
  const page = await http.get('/v1/bookmarks', bookmarkPageSchema, signal ? { signal } : {})
  if (page.article_ids.length === 0) return []
  const cards = await http.get('/v1/articles', z.object({ items: z.array(feedCardDtoSchema) }), {
    query: { ids: page.article_ids.join(',') },
    ...(signal ? { signal } : {}),
  })
  const order = new Map(page.article_ids.map((id, index) => [id, index]))
  return cards.items.map((item) => toArticleCard(item)).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
}
