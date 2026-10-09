import { articleDraftSchema } from '@blog/contracts'
import type { ArticleDraft } from '@blog/contracts'
import { http } from '@/shared/api'

export function getArticleDraft(id: string, signal?: AbortSignal): Promise<ArticleDraft> {
  return http.get(`/v1/articles/${encodeURIComponent(id)}/draft`, articleDraftSchema, signal ? { signal } : {})
}
