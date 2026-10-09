import { emptyResponseSchema, http } from '@/shared/api'

export function deleteArticle(id: string): Promise<void> {
  return http.delete(`/v1/articles/${encodeURIComponent(id)}`, emptyResponseSchema)
}
