import { z } from 'zod'
import { http } from '@/shared/api'
import { feedCardDtoSchema, toArticleCard } from './feed-schema.ts'
import type { ArticleCardModel } from '../model/article-types.ts'

const bookmarkPageSchema = z.object({
  article_ids: z.array(z.string()),
  next_cursor: z.string().nullable().optional(),
})

export type BookmarkCardsPage = {
  items: ArticleCardModel[]
  next_cursor: string | null
}

/** Закладки участника в том порядке, в каком их вернул сервер. */
export async function getBookmarks(
  cursor: string | null,
  signal?: AbortSignal,
): Promise<BookmarkCardsPage> {
  const page = await http.get('/v1/bookmarks', bookmarkPageSchema, {
    query: cursor ? { cursor } : {},
    ...(signal ? { signal } : {}),
  })
  if (page.article_ids.length === 0) return { items: [], next_cursor: null }
  const cards = await http.get('/v1/articles', z.object({ items: z.array(feedCardDtoSchema) }), {
    query: { ids: page.article_ids.join(',') },
    ...(signal ? { signal } : {}),
  })
  const order = new Map(page.article_ids.map((id, index) => [id, index]))
  const items = cards.items
    .map((item) => toArticleCard(item))
    .sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return { items, next_cursor: page.next_cursor ?? null }
}
