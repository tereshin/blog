import { recordViewSchema, viewCountSchema } from '@blog/contracts'
import type { ViewCount } from '@blog/contracts'
import { http } from '@/shared/api'

/** Один просмотр статьи. `moderation` — страница открыта из очереди модерации. */
export function recordView(article_id: string, context?: 'moderation'): Promise<ViewCount> {
  return http.post(`/v1/articles/${article_id}/views`, viewCountSchema, {
    body: recordViewSchema.parse(context ? { context } : {}),
  })
}
