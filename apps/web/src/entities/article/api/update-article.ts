import { articleDraftSchema, updateArticleSchema } from '@blog/contracts'
import type { ArticleDraft, UpdateArticle } from '@blog/contracts'
import { http } from '@/shared/api'

export function updateArticle(id: string, body: UpdateArticle): Promise<ArticleDraft> {
  return http.patch(`/v1/articles/${encodeURIComponent(id)}`, articleDraftSchema, { body: updateArticleSchema.parse(body) })
}
