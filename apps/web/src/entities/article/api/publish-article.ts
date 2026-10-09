import { articleDraftSchema } from '@blog/contracts'
import type { ArticleDraft } from '@blog/contracts'
import { http } from '@/shared/api'

export function publishArticle(id: string): Promise<ArticleDraft> {
  return http.post(`/v1/articles/${encodeURIComponent(id)}/publish`, articleDraftSchema)
}
