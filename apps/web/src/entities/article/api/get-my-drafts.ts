import { articleDraftListSchema } from '@blog/contracts'
import type { ArticleDraftList } from '@blog/contracts'
import { http } from '@/shared/api'

export function getMyDrafts(signal?: AbortSignal): Promise<ArticleDraftList> {
  return http.get('/v1/me/articles', articleDraftListSchema, { query: { status: 'draft' }, ...(signal ? { signal } : {}) })
}
