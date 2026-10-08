import { z } from 'zod'
import { http } from '@/shared/api'
import { feedCardDtoSchema, toArticleCard } from './feed-schema.ts'
import type { ArticleCardModel } from '../model/article-types.ts'

const cardsSchema = z.object({ items: z.array(feedCardDtoSchema) })

/** Карточки по идентификаторам: живое обновление ленты перечитывает только затронутые. */
export async function getArticlesByIds(ids: readonly string[], signal?: AbortSignal): Promise<ArticleCardModel[]> {
  if (ids.length === 0) return []
  const response = await http.get('/v1/articles', cardsSchema, {
    query: { ids: ids.join(',') },
    ...(signal ? { signal } : {}),
  })
  return response.items.map((item) => toArticleCard(item))
}
