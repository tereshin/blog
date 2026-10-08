import { z } from 'zod'
import { http } from '@/shared/api'
import type { ArticleViewerState } from '../model/article-types.ts'

const responseSchema = z.object({
  states: z.record(z.string(), z.object({ my_reaction: z.enum(['laugh', 'heart', 'thumb', 'fire']).nullable(), is_bookmarked: z.boolean() })),
})

export async function getArticleStates(article_ids: readonly string[], signal?: AbortSignal): Promise<Record<string, ArticleViewerState>> {
  if (article_ids.length === 0) return {}
  const response = await http.get('/v1/me/article-states', responseSchema, {
    query: { article_ids: article_ids.join(',') },
    ...(signal ? { signal } : {}),
  })
  return response.states
}
